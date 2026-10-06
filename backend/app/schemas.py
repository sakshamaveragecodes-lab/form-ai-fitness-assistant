from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)


class NutritionInput(StrictModel):
    age: int = Field(ge=18, le=90)
    sex: Literal['male', 'female', 'unspecified'] = 'unspecified'
    height: float = Field(ge=100, le=230)
    weight: float = Field(ge=30, le=250)
    activity: Literal['sedentary', 'light', 'moderate', 'active'] = 'moderate'
    goal: Literal['fitness', 'strength', 'muscle', 'fat_loss'] = 'fitness'
    sensitive: bool = False


class Rep(StrictModel):
    duration: float = Field(ge=.5, le=120)
    range: float = Field(ge=0, le=100)
    form: float = Field(ge=0, le=100)
    tempo: float = Field(ge=0, le=100)


class PerformanceInput(StrictModel):
    exercise: Literal['squat', 'pushup', 'curl', 'press', 'lunge', 'plank']
    target: int = Field(ge=1, le=1000)
    reps: list[Rep] = Field(max_length=1000)


class Telemetry(StrictModel):
    simulated: bool = False
    sequence: int = Field(ge=0, le=2147483647)
    resistance: float = Field(ge=0, le=500)
    reps: int = Field(ge=0, le=200)
    duration: float = Field(ge=0, le=7200)
    rest: float = Field(ge=0, le=1800)
    heart_rate: int | None = Field(default=None, ge=30, le=240)
    rpe: float = Field(ge=1, le=10)
    form: float = Field(ge=0, le=100)
