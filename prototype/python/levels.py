"""Definície levelov pre Q.E.D.

Každý level je slovník:
  name, subtitle  – názov a podnadpis
  target          – cieľová hodnota (Fraction), target_text – ako sa zobrazí
  template        – výraz: reťazce sú pevný text, S (None) je slot, ktorý hráč plní
  evaluate        – funkcia(list textov v slotoch) -> Fraction alebo None (neplatné)
  time            – čas na level v sekundách
  spawn           – štartová pozícia profesora (x)
  door_x          – x-ová pozícia dverí (na zemi)
  platforms       – (x, y_vrchu, šírka, druh)  druh: "shelf" | "desk"
  tokens          – (text, x, y) zberateľné čísla/operátory

Pri štarte hry sa overí, že každý level má aspoň jedno riešenie.
Plošina vo výške y je dosiahnuteľná, ak je ~<=120 px nad tou, z ktorej sa skáče.
"""
from fractions import Fraction

S = None  # slot
OPS = {"+", "−", "×", "÷"}


def _num(v):
    if v in OPS:
        raise ValueError(v)
    return Fraction(v)


def safe(fn):
    def wrapped(vals):
        try:
            return fn(vals)
        except (ValueError, ZeroDivisionError, TypeError, OverflowError):
            return None
    return wrapped


@safe
def eval_arith(vals):
    """Číslo op číslo op číslo ... s prednosťou × ÷ pred + −."""
    if len(vals) % 2 == 0:
        return None
    nums, ops = [], []
    for i, v in enumerate(vals):
        if i % 2 == 0:
            nums.append(_num(v))
        elif v in OPS:
            ops.append(v)
        else:
            return None
    terms, signs = [nums[0]], []
    for op, n in zip(ops, nums[1:]):
        if op == "×":
            terms[-1] *= n
        elif op == "÷":
            terms[-1] /= n
        else:
            signs.append(op)
            terms.append(n)
    result = terms[0]
    for op, n in zip(signs, terms[1:]):
        result = result + n if op == "+" else result - n
    return result


@safe
def eval_power(vals):          # a ^ b − c
    a, b, c = map(_num, vals)
    return a ** b - c


@safe
def eval_derivative(vals):     # d/dx (a·x^n) v bode x
    a, n, x = map(_num, vals)
    return a * n * x ** (n - 1)


@safe
def eval_integral(vals):       # ∫ od c do b (a·x) dx
    c, b, a = map(_num, vals)
    return a * (b * b - c * c) / 2


@safe
def eval_probability(vals):    # a/b · c/d
    a, b, c, d = map(_num, vals)
    return (a / b) * (c / d)


LEVELS = [
    {
        "name": "1. Aritmetika",
        "subtitle": "Pozor na prednosť operátorov!",
        "target": Fraction(14), "target_text": "14",
        "template": [S, S, S, S, S],
        "evaluate": eval_arith,
        "time": 45, "spawn": 60, "door_x": 1170,
        "platforms": [
            (180, 530, 200, "desk"), (420, 430, 180, "shelf"), (660, 530, 190, "desk"),
            (900, 420, 180, "shelf"), (640, 320, 170, "shelf"), (250, 320, 190, "shelf"),
            (1040, 300, 200, "shelf"),
        ],
        "tokens": [
            ("2", 280, 482), ("+", 340, 272), ("3", 725, 272), ("×", 510, 382),
            ("4", 1140, 252), ("5", 755, 482), ("−", 990, 372), ("1", 560, 582),
        ],
    },
    {
        "name": "2. Aritmetika II",
        "subtitle": "Delenie je tiež operácia",
        "target": Fraction(7), "target_text": "7",
        "template": [S, S, S, S, S],
        "evaluate": eval_arith,
        "time": 50, "spawn": 60, "door_x": 1170,
        "platforms": [
            (60, 520, 150, "shelf"), (300, 530, 160, "desk"), (130, 410, 160, "shelf"),
            (380, 300, 170, "shelf"), (620, 400, 160, "shelf"), (840, 530, 170, "desk"),
            (850, 310, 160, "shelf"), (1080, 420, 150, "shelf"), (620, 200, 150, "shelf"),
        ],
        "tokens": [
            ("9", 135, 472), ("÷", 210, 362), ("3", 695, 152), ("+", 380, 482),
            ("4", 930, 262), ("×", 700, 352), ("2", 1155, 372), ("−", 465, 252),
            ("8", 925, 482),
        ],
    },
    {
        "name": "3. Mocniny",
        "subtitle": "Exponent rastie rýchlo",
        "target": Fraction(23), "target_text": "23",
        "template": [S, "^", S, "−", S],
        "evaluate": eval_power,
        "time": 50, "spawn": 40, "door_x": 1170,
        "platforms": [
            (120, 530, 180, "desk"), (350, 430, 160, "shelf"), (120, 330, 160, "shelf"),
            (560, 330, 180, "shelf"), (600, 530, 200, "desk"), (860, 430, 160, "shelf"),
            (820, 230, 170, "shelf"), (1060, 330, 160, "shelf"),
        ],
        "tokens": [
            ("5", 200, 282), ("2", 1140, 282), ("3", 650, 282), ("4", 905, 182),
            ("1", 700, 482), ("7", 210, 482), ("2", 940, 382),
        ],
    },
    {
        "name": "4. Derivácie",
        "subtitle": "(a·x^n)' = a·n·x^(n−1)",
        "target": Fraction(12), "target_text": "12",
        "template": ["d/dx (", S, "· x^", S, ")  v bode x =", S],
        "evaluate": eval_derivative,
        "time": 55, "spawn": 60, "door_x": 1170,
        "platforms": [
            (40, 520, 140, "shelf"), (250, 430, 140, "shelf"), (460, 340, 140, "shelf"),
            (670, 250, 160, "shelf"), (520, 530, 180, "desk"), (900, 350, 150, "shelf"),
            (880, 530, 170, "desk"), (1100, 430, 140, "shelf"),
        ],
        "tokens": [
            ("3", 110, 472), ("2", 320, 382), ("1", 530, 292), ("4", 750, 202),
            ("2", 975, 302), ("5", 610, 482), ("6", 965, 482),
        ],
    },
    {
        "name": "5. Integrály",
        "subtitle": "∫ a·x dx = a·x²/2",
        "target": Fraction(9), "target_text": "9",
        "template": ["∫ od", S, "do", S, "(", S, "· x ) dx"],
        "evaluate": eval_integral,
        "time": 60, "spawn": 40, "door_x": 1170,
        "platforms": [
            (100, 530, 170, "desk"), (330, 440, 150, "shelf"), (90, 350, 170, "shelf"),
            (330, 260, 150, "shelf"), (90, 190, 150, "shelf"), (580, 330, 180, "shelf"),
            (700, 530, 170, "desk"), (930, 430, 150, "shelf"), (1080, 320, 150, "shelf"),
            (860, 220, 160, "shelf"),
        ],
        "tokens": [
            ("0", 165, 142), ("1", 185, 482), ("2", 160, 302), ("3", 1155, 272),
            ("4", 405, 392), ("5", 940, 172), ("6", 670, 282),
        ],
    },
    {
        "name": "6. Pravdepodobnosť",
        "subtitle": "Nezávislé javy: P(A∩B) = P(A)·P(B)",
        "target": Fraction(1, 6), "target_text": "1/6",
        "template": ["P =", S, "/", S, "·", S, "/", S],
        "evaluate": eval_probability,
        "time": 60, "spawn": 60, "door_x": 1170,
        "platforms": [
            (40, 530, 130, "shelf"), (240, 530, 140, "desk"), (420, 430, 140, "shelf"),
            (200, 330, 150, "shelf"), (430, 230, 150, "shelf"), (650, 330, 140, "shelf"),
            (850, 240, 140, "shelf"), (700, 530, 160, "desk"), (920, 430, 140, "shelf"),
            (1090, 330, 140, "shelf"),
        ],
        "tokens": [
            ("1", 105, 482), ("2", 310, 482), ("3", 490, 382), ("1", 275, 282),
            ("6", 505, 182), ("4", 720, 282), ("5", 920, 192),
        ],
    },
]

for _lvl in LEVELS:
    _lvl["slots"] = _lvl["template"].count(S)
