from pydantic import BaseModel

class FeatureVector(BaseModel):
    pitch_mean: float
    pitch_std: float
    f1_mean: float
    f2_mean: float
    zcr_mean: float
    zcr_std: float
    energy_mean: float
    energy_std: float
