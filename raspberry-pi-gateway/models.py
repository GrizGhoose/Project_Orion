from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True, allow_inf_nan=False)


class Reading(StrictModel):
    seq: int = Field(ge=1)
    t_ms: int = Field(ge=0)
    hr: int | None = Field(ge=35, le=220)
    spo2: int | None = Field(ge=70, le=100)
    valid: bool
    quality: Literal['good', 'warming_up', 'sensor_missing', 'poor_contact_or_signal', 'algorithm_invalid']
    state: Literal['NORMAL', 'WARNING', 'CRITICAL', 'CALIBRATING', 'NO_SIGNAL']
    alert: Literal['NORMAL', 'WARNING', 'CRITICAL']
    hr_elevated: bool

    @model_validator(mode='after')
    def check_validity(self):
        if self.valid != (self.hr is not None and self.spo2 is not None):
            raise ValueError('Validity and measurements disagree')
        if not self.valid and (self.hr is not None or self.spo2 is not None or self.state != 'NO_SIGNAL'):
            raise ValueError('Invalid readings must contain null measurements and NO_SIGNAL')
        return self


MeasurementQuality = Literal['accepted', 'not_evaluated', 'weak_signal', 'clipped_signal',
    'flat_signal', 'unstable_signal', 'inconsistent_pulses', 'channel_disagreement',
    'unstable_ratio', 'algorithm_invalid', 'out_of_range']


class ReadingV2(StrictModel):
    source: Literal['sensor', 'simulated'] = 'sensor'
    seq: int = Field(ge=1)
    t_ms: int = Field(ge=0)
    hr: int | None = Field(ge=35, le=220)
    spo2: int | None = Field(ge=70, le=100)
    hr_valid: bool
    spo2_valid: bool
    valid: bool  # Both measurements accepted; never use this to hide an accepted single metric.
    acquisition: Literal['ok', 'warming_up', 'sampling_gap', 'sensor_missing',
                         'i2c_error', 'configuration_error', 'no_samples']
    hr_quality: MeasurementQuality
    spo2_quality: MeasurementQuality
    quality: Literal['accepted', 'partial', 'rejected', 'not_evaluated']
    state: Literal['NORMAL', 'WARNING', 'CRITICAL', 'CALIBRATING', 'WARMING_UP',
                   'ACQUISITION_ERROR', 'PARTIAL_SIGNAL', 'MEASUREMENT_REJECTED']
    alert: Literal['NORMAL', 'WARNING', 'CRITICAL']
    hr_elevated: bool

    @model_validator(mode='after')
    def check_validity(self):
        if self.hr_valid != (self.hr is not None) or self.spo2_valid != (self.spo2 is not None):
            raise ValueError('Per-metric validity and values disagree')
        if self.valid != (self.hr_valid and self.spo2_valid):
            raise ValueError('Combined validity disagrees')
        if self.hr_valid != (self.hr_quality == 'accepted') or self.spo2_valid != (self.spo2_quality == 'accepted'):
            raise ValueError('Per-metric quality and validity disagree')
        if self.hr_elevated and not self.hr_valid:
            raise ValueError('HR advisory requires accepted HR')
        if self.acquisition != 'ok':
            expected = 'WARMING_UP' if self.acquisition in ('warming_up', 'sampling_gap') else 'ACQUISITION_ERROR'
            if self.hr_quality != 'not_evaluated' or self.spo2_quality != 'not_evaluated' or self.quality != 'not_evaluated' or self.state != expected:
                raise ValueError('Acquisition failure cannot contain evaluated measurements')
        else:
            quality = 'accepted' if self.valid else 'partial' if self.hr_valid or self.spo2_valid else 'rejected'
            states = {'NORMAL', 'CALIBRATING'} if self.valid else {'PARTIAL_SIGNAL'} if self.hr_valid or self.spo2_valid else {'MEASUREMENT_REJECTED'}
            if self.spo2_valid and self.alert in ('WARNING', 'CRITICAL'):
                states = {self.alert}
            if self.quality != quality or self.state not in states or 'not_evaluated' in (self.hr_quality, self.spo2_quality):
                raise ValueError('Measurement quality/state inconsistent')
        return self


class Baseline(StrictModel):
    ready: bool
    count: int = Field(ge=0, le=15)
    required: Literal[15]
    hr: float | None = Field(ge=40, le=120)
    spo2: float | None = Field(ge=95, le=100)

    @model_validator(mode='after')
    def check_ready(self):
        if self.ready != (self.count == 15):
            raise ValueError('Baseline progress inconsistent')
        if self.ready != (self.hr is not None and self.spo2 is not None):
            raise ValueError('Baseline values inconsistent')
        return self


class Packet(StrictModel):
    schema_version: Literal[1, 2, 3] = Field(alias='schema')
    device_id: str = Field(pattern=r'^[a-zA-Z0-9_-]{1,32}$')
    boot_id: str = Field(pattern=r'^[a-f0-9]{16}$')
    sent_at_ms: int = Field(ge=0)
    calibration_id: int = Field(ge=1)
    last_command_id: str = Field(pattern=r'^[a-zA-Z0-9-]{0,64}$')
    baseline: Baseline
    history: list[Reading | ReadingV2] = Field(min_length=1, max_length=90)

    @model_validator(mode='after')
    def check_order(self):
        expected = ReadingV2 if self.schema_version >= 2 else Reading
        if any(type(row) is not expected for row in self.history):
            raise ValueError('Reading format does not match schema version')
        if self.schema_version < 3 and len(self.history) > 15:
            raise ValueError('Legacy history is limited to 15 reports')
        if self.schema_version == 3 and self.history[-1].t_ms-self.history[0].t_ms >= 90000:
            raise ValueError('History must lie within the trailing 90 seconds')
        if self.sent_at_ms < self.history[-1].t_ms:
            raise ValueError("Send time precedes sampling")
        for a, b in zip(self.history, self.history[1:]):
            if b.seq != a.seq + 1 or b.t_ms <= a.t_ms:
                raise ValueError('History must be ordered and contiguous')
        return self
