# Visor-local optical HUD

This is a **two-dimensional angular schematic**, not a helmet fit model, manufactured optical surface, physical visor dimension, sensor specification, display resolution or NASA certification. The browser is a demonstration canvas.

## Guidance and assumptions

NASA-STD-3001 Volume 2 [section 11.1.6](https://www.nasa.gov/reference/11-0-spacesuits-vol-2/) addresses task-sufficient suited field of regard (V2 11018), helmet optical quality (11019), luminance protection (11020), visual distortion (11021), and avoiding display interference with field of regard (11022). Our interpretation is to separate the scene from projected content, reserve central vision, keep text upright and use local contrast rather than changing the entire scene. This implementation does not demonstrate compliance.

Historical EMU visibility/FOV figures describe what a wearer can see through a helmet; they do **not** define a projectable display area. Field of regard also concerns the visual region accessible during tasks, not just a fixed display frustum. Actual total helmet visibility and peripheral capability depend on helmet, head/eye position and task; no measured total EMU field is asserted here.

The requested initial **40° horizontal × 30° vertical** optical field is illustrative. Collins Aerospace describes a 30-by-40-degree bi-ocular field for its [F-35 Gen III display](https://www.rtx.com/collinsaerospace/what-we-do/industries/military-and-defense/displays-and-controls/airborne/helmet-mounted-displays/f-35-gen-iii-helmet-mounted-display-system); that supports the general scale of the prototype assumption, not transferring aircraft optics, calibration, binocular overlap or certification to a spacesuit.

| Region / quantity                         | Default                                               | Meaning and limitation                                                                                                       |
| ----------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Actual helmet field of view / regard      | Unknown                                               | Must be measured for selected suit, wearer and task; no physical total FOV is inferred                                       |
| Simulated viewing region                  | Viewport-fit ellipse; nominal 70 x 50 layout scale    | A wider **illustrative schematic window** used to show separation from projection; not total human/EMU peripheral visibility |
| Curved visor                              | Rounded aperture and ellipse guides                   | Layout curvature proxy only; no lens mesh, real radius, perspective or text warp                                             |
| Optical display region                    | 40° H × 30° V, upper anchored                         | Assumed usable projection field; symbols remain inside it, outside region has scene only                                     |
| Central clear zone                        | 14° H × 10° V, centred toward the actual forward view | Rectangular protected task region; no readouts, controls or alerts enter it                                                  |
| Optical offset                            | 0° H / 0° V                                           | Positive horizontal moves right, positive vertical moves up, relative to the simulated viewing region                        |
| Peripheral context outside optical region | No projected symbols                                  | External scene remains visible; not a measured peripheral-vision model                                                       |
| Drawing scale                             | 20 arbitrary units per schematic degree               | Convenient layout conversion, **not pixels per degree or hardware resolution**                                               |

## Viewport and optical coordinate systems (Phase 5)

The scene is a separate 100%-wide, 100dvh ellipse, flush with the first viewport. The photo uses object-fit cover with no stretching, global tint or colour changes. Curved corners remain blocked. The independent optical region retains its illustrative 40 x 30 degree extent and upright symbology. A full-screen scene does not make the complete visor projectable.

[opticalGeometry.js](../src/constants/opticalGeometry.js) centralises the assumptions and 50px requested upper inset. [useVisorScale.js](../src/features/helmet/hooks/useVisorScale.js) observes the canvas and computes one uniform optical scale against the nominal 1400 x 1000 drawing extent. That is an abstract layout reference, not resolution or measured visor size. The actual viewing coordinate bounds become canvasWidth/scale and canvasHeight/scale. This lets the scene ellipse fill any aspect without scaling text differently on each axis. The changing canvas ellipse does not imply a changing known human field of view.

[visorGeometry.js](../src/features/helmet/geometry/visorGeometry.js) centres the optical field horizontally. For its vertical origin it solves the viewing ellipse at the outermost optical corner, then chooses the greater of curved-boundary clearance and the requested 50px inset minus the local timer inset. Explicit optical offsets remain bounded by ellipse clearance. Thus the centre timer is approximately 50px from the top where the aperture fits; portrait or wider optical fields can require a larger inset. The two bar groups sit 12 drawing units lower to respect the upper arc. The shared top-layout container uses optical-local coordinates for all three groups.

The nominal 70 x 50 viewing assumptions supply layout scale only. The optical 40 x 30 assumption and 14 x 10 central clear zone remain illustrative. Supported controls: optical H 36-44 degrees, V 27-33; clear H 10-16, V 8-12; optical offsets +/-1.5; safety margin 0.4-0.8. No values represent certified astronaut optics.

| Optical-local zone | x / y / width / height              | Content                                  |
| ------------------ | ----------------------------------- | ---------------------------------------- |
| Physiology         | .035 / inset + 12 units / .28 / .19 | Breathing and HR bars                    |
| Mission            | .345 / inset / .31 / .205           | Countdown, source and safety             |
| Oxygen             | .685 / inset + 12 units / .28 / .19 | SpO2 marker and oxygen reserve fill      |
| Image failure      | .25 / .94 / .50 / .025              | Image failure only                       |
| Suit / health      | .035 / .45 / .20 / .30              | Contextual information                   |
| Buddy              | .765 / .45 / .20 / .30              | Buddy context                            |
| Alerts             | .05 / .245 / .90 / .18              | Prioritised hazard, astronaut and action |

Apart from y positions explicitly expressed in drawing units, entries are fractions of optical width/height. The local inset is the configured safety margin times 20 drawing units per degree. The clear rectangle follows the actual canvas centre where it fits inside the optical field and is clamped within that aperture on very tall canvases. Its upper edge is at least 45% of optical height, below the alert strip. Alerts sit directly below primary telemetry, so raising the optical aperture does not pull an old lower alert band into the visual centre. Contextual panels stay to the sides below that strip. All zones avoid the central clear rectangle and each other; rounded optical corners and the full viewing ellipse also constrain placement. Text is not perspective-warped.

## Presentation and calibration

The first section always uses the full visible viewport. The labelled developer panel begins below it in ordinary document flow; it is not fixed or sticky and does not consume any first-screen height. Scrolling exposes all controls. Astronaut/fullscreen presentation removes the panel, demo shortcuts and calibration. Browser fullscreen has a layout-only fallback; Escape restores development presentation. Source provenance stays visible.

The developer-only SVG overlay uses the same canvas-fitted viewing bounds, optical rectangle, central-clear zone and placement rectangles. It remains off by default, is suppressed in astronaut mode, and is excluded from production. The viewing boundary is labelled CANVAS FIT rather than a claimed physical total FOV.

## Verification and remaining limitations

61 tests cover geometry, alert boundaries, quality, deterministic simulation, bounded state, cross-tab coordination, contextual reveal and presentation workflows. Geometry tests include the nominal control extremes and five viewport shapes, covering ellipse containment and clear-zone preservation. Browser checks verify full scene width, 100dvh height, controls below the viewport, no content overflow and visible critical responses.

[Indicator documentation](./telemetry-indicators.md) distinguishes visual axes from medical ranges. [The shared contract](./telemetry-contract.md) defines optional SpO2 quality and timestamp handling. No backend, driver, 3D model or chart dependency was added.

Small windows still display scaled optical symbology; geometric fit does not establish physical angular legibility. The photograph lacks calibrated angular metadata. Before hardware, measure eye relief/eye box, optical axis and usable field, binocular overlap/alignment, distortion, accommodation, luminance/transmission, contrast, helmet motion and safe inputs. CSS ellipses and aircraft inspiration do not validate those conditions.

## Current visor outline and lowered telemetry

The viewing mask now has a flat upper rim, rounded temples and a curved lower bowl rather than an ellipse. [VisorScene](../src/features/helmet/components/VisorScene.jsx) clips the original photograph using a normalized SVG path; [the shared outline function](../src/features/helmet/geometry/visorGeometry.js) also draws the calibration boundary. The photo still fills the whole viewport and is not restricted to the optical field.

The browser-top overrides have been removed. The actual optical field starts at its computed safe-area origin; mission, physiological and oxygen groups all use their optical-local zone positions. The earlier ellipse-based clearance remains a conservative layout proxy inside the wider flat-top outline, not a physical fishbowl dimension. There is no extra vertical offset on contextual content, so alerts, context and calibration share the same origin. This supersedes earlier notes about extending the optical field to top zero. The developer panel remains below the first full-height viewport.

## Curved projection styling

The upper HUD now follows the supplied visual reference using a continuous double-line blue brow, a raised front-facing countdown and mirrored side wings. [UpperVisorFrame](../src/features/helmet/components/UpperVisorFrame.jsx) renders the thin SVG frame. Each side wing uses an 8-degree upward-outward roll, 9-degree yaw and shallow 4-degree pitch through CSS perspective. These transforms affect only the two reading surfaces, not the scene, alerts or the entire application. The layout remains inside the configured optical aperture.

[TelemetryBar](../src/components/telemetry/TelemetryBar.jsx) optionally renders a shallow quadratic SVG track. Its marker follows the curve at the same normalized numeric position as the straight scale; oxygen reserve follows a curved percentage stroke. Numbers, units, quality states and out-of-range labels remain unchanged. This is a two-dimensional projection effect with modest perspective, not a 3D model or calibrated visor distortion. The central and lower task area remains free of decorative symbology.
