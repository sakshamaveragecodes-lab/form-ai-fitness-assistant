"""Python interoperability reference for the browser/edge scoring contract."""
from math import floor, sqrt


def js_round(value: float) -> int:
    return floor(value + 0.5)


def nutrition(data: dict) -> dict:
    base = 10 * data['weight'] + 6.25 * data['height'] - 5 * data['age']
    bmr = base + {'male': 5, 'female': -161, 'unspecified': -78}[data['sex']]
    tdee = bmr * {'sedentary': 1.2, 'light': 1.375, 'moderate': 1.55, 'active': 1.725}[data['activity']]
    bmi = data['weight'] / (data['height'] / 100) ** 2
    blocked = data['sensitive'] or data['age'] < 18 or (bmi < 18.5 and data['goal'] == 'fat_loss')
    change = -min(350, tdee * .15) if data['goal'] == 'fat_loss' else min(250, tdee * .1) if data['goal'] == 'muscle' else 0
    calories = js_round(max(bmr, tdee + change))
    protein, fat = js_round(data['weight'] * 1.6), js_round(calories * .3 / 9)
    return {'bmi': js_round(bmi * 10) / 10, 'bmr': js_round(bmr), 'tdee': js_round(tdee),
            'bmrRange': [js_round(base - 161), js_round(base + 5)] if data['sex'] == 'unspecified' else None,
            'calories': None if blocked else calories, 'protein': None if blocked else protein,
            'fat': None if blocked else fat, 'carbs': None if blocked else js_round((calories - protein * 4 - fat * 9) / 4), 'blocked': blocked}


def performance(reps: list[dict], target: int, exercise: str) -> dict:
    empty = dict.fromkeys(['score', 'form', 'rom', 'tempo', 'consistency'])
    if not reps:
        return {**empty, 'completion': 0}
    if exercise == 'plank':
        hold = sum(r['duration'] for r in reps)
        form = sum(r['form'] * r['duration'] for r in reps) / hold
        completion = min(100, hold / max(1, target) * 100)
        return {**empty, 'score': js_round(.7 * form + .3 * completion), 'form': js_round(form), 'completion': js_round(completion)}
    mean = lambda key: sum(r[key] for r in reps) / len(reps)
    form, rom, tempo, duration = mean('form'), mean('range'), mean('tempo'), mean('duration')
    variance = sum((r['duration'] - duration) ** 2 for r in reps) / len(reps)
    consistency = max(0, min(100, 100 * (1 - sqrt(variance) / max(duration, .1)))) if len(reps) > 1 else None
    completion = min(100, len(reps) / max(1, target) * 100)
    score = (.35 * form + .25 * rom + .15 * tempo + .1 * completion + (.15 * consistency if consistency is not None else 0)) / (1 if consistency is not None else .85)
    return {'score': js_round(score), 'form': js_round(form), 'rom': js_round(rom), 'tempo': js_round(tempo), 'consistency': js_round(consistency) if consistency is not None else None, 'completion': js_round(completion)}
