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
    schema_version: Literal[1] = Field(alias='schema')
    device_id: str = Field(pattern=r'^[a-zA-Z0-9_-]{1,32}$')
    boot_id: str = Field(pattern=r'^[a-f0-9]{16}$')
    sent_at_ms: int = Field(ge=0)
    calibration_id: int = Field(ge=1)
    last_command_id: str = Field(pattern=r'^[a-zA-Z0-9-]{0,64}$')
    baseline: Baseline
    history: list[Reading] = Field(min_length=1, max_length=15)

    @model_validator(mode='after')
    def check_order(self):
        if self.sent_at_ms < self.history[-1].t_ms:
            raise ValueError("Send time precedes sampling")
        for a, b in zip(self.history, self.history[1:]):
            if b.seq != a.seq + 1 or b.t_ms <= a.t_ms:
                raise ValueError('History must be ordered and contiguous')
        return self
