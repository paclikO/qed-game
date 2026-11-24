"""Q.E.D. – profesorova skákačka (prototyp).

Spustenie:   python qed.py
Ovládanie:   ← → / A D  pohyb, Medzera / ↑ / W  skok, ↓ / S  zoskočiť z poličky
             F zobrať symbol, E guma (vráti posledný symbol), R reset levelu, Esc koniec
"""
import math
import os
import random
import sys
from fractions import Fraction
from itertools import permutations

if "--screenshots" in sys.argv:
    os.environ["SDL_VIDEODRIVER"] = "dummy"

import pygame

from levels import LEVELS

# ---------------------------------------------------------------- konštanty
W, H = 1280, 720
FLOOR_Y = 630
GRAVITY = 2200.0
JUMP_V = 800.0
SPEED = 320.0
COYOTE_TIME = 0.10
JUMP_BUFFER = 0.12
PENALTY_S = 3          # koľko sekúnd stojí chyba
ERASERS = 2            # počet gúm na level
TOKEN_R = 24
PLAYER_W, PLAYER_H = 34, 58

BOARD = (33, 56, 46)
CHALK = (236, 236, 222)
CHALK_DIM = (150, 170, 155)
WOOD = (150, 98, 52)
WOOD_D = (98, 60, 30)
WOOD_L = (190, 132, 76)
GOLD = (255, 214, 120)
RED = (235, 95, 85)
GREEN = (130, 225, 150)

FORMULAS = [
    "e^(iπ) + 1 = 0", "∑ 1/n² = π²/6", "∫ f(x) dx", "a² + b² = c²",
    "lim sin(x)/x = 1", "∂f/∂x", "E[X] = ∑ x·p(x)", "n! ≈ √(2πn)·(n/e)ⁿ",
    "P(A|B) = P(B|A)·P(A) / P(B)", "f'(x) = lim (f(x+h) − f(x)) / h",
    "√2 ≈ 1.41421", "Var X = E[X²] − (E X)²", "(a+b)² = a² + 2ab + b²",
]
MISTAKE_LINES = ["Dochádza mu trieda!", "To nevyjde...", "Chyba v dôkaze!", "Hmm, tadiaľ nie."]


def frac_str(v):
    if v is None:
        return "?"
    return str(v.numerator) if v.denominator == 1 else f"{v.numerator}/{v.denominator}"


def can_complete(level, prefix, pool):
    """Dá sa z aktuálneho začiatku výrazu a zvyšných symbolov ešte dosiahnuť cieľ?"""
    k = level["slots"] - len(prefix)
    if k > len(pool):
        return False
    for combo in set(permutations(pool, k)):
        if level["evaluate"](list(prefix) + list(combo)) == level["target"]:
            return True
    return False


def validate_levels():
    for lvl in LEVELS:
        pool = [t[0] for t in lvl["tokens"]]
        if not can_complete(lvl, [], pool):
            raise SystemExit(f"Level '{lvl['name']}' nemá riešenie!")


# ---------------------------------------------------------------- objekty
class Token:
    def __init__(self, text, x, y, surf):
        self.text = text
        self.home = (x, y)
        self.surf = surf
        self.phase = random.random() * math.tau
        self.collected = False
        self.armed = True     # po gume sa dá zobrať až keď od neho profesor odíde

    def pos(self, t):
        return self.home[0], self.home[1] + math.sin(t * 2.2 + self.phase) * 5


class Player:
    def __init__(self, x):
        self.x, self.y = float(x), float(FLOOR_Y - PLAYER_H)
        self.vx = self.vy = 0.0
        self.facing = 1
        self.on_ground = True
        self.coyote = 0.0
        self.jbuf = 0.0
        self.drop = 0.0
        self.walk_t = 0.0

    @property
    def rect(self):
        return pygame.Rect(int(self.x), int(self.y), PLAYER_W, PLAYER_H)

    @property
    def center(self):
        return self.x + PLAYER_W / 2, self.y + PLAYER_H / 2


# ---------------------------------------------------------------- hra
class Game:
    def __init__(self):
        pygame.init()
        pygame.display.set_caption("Q.E.D.")
        self.screen = pygame.display.set_mode((W, H))
        self.clock = pygame.time.Clock()
        self.world = pygame.Surface((W, H))
        sysfont = pygame.font.SysFont
        self.f_chalk_xl = sysfont("segoeprint,comicsansms,arial", 96, bold=True)
        self.f_chalk_l = sysfont("segoeprint,comicsansms,arial", 38, bold=True)
        self.f_chalk = sysfont("segoeprint,comicsansms,arial", 24)
        self.f_chalk_s = sysfont("segoeprint,comicsansms,arial", 18)
        self.f_math = sysfont("segoeui,arial,dejavusans", 30, bold=True)
        self.f_math_s = sysfont("segoeui,arial,dejavusans", 24)
        self.f_bg = sysfont("segoeui,arial,dejavusans", 30)
        self.t = 0.0
        self.state = "title"
        self.level_i = 0
        self.score = 0
        self.particles = []
        self.msg = None
        self.msg_cd = 0.0
        self.shake = 0.0
        self.load_level(0)

    # ------------------------------------------------------------ level
    def load_level(self, i):
        self.level_i = i
        self.level = lvl = LEVELS[i]
        self.platforms = [(pygame.Rect(x, y, w, 14), kind) for x, y, w, kind in lvl["platforms"]]
        self.tokens = [Token(txt, x, y, self.make_token_surf(txt)) for txt, x, y in lvl["tokens"]]
        self.door = pygame.Rect(lvl["door_x"], FLOOR_Y - 130, 76, 130)
        self.time_left = float(lvl["time"])
        self.erasers = ERASERS
        self.mistakes = 0
        self.background = self.make_background(i)
        self.reset_board()

    def reset_board(self):
        self.player = Player(self.level["spawn"])
        self.near_token = None
        self.tray = []
        self.dead = False
        for tok in self.tokens:
            tok.collected = False
            tok.armed = True

    # ------------------------------------------------------------ grafika – príprava
    def make_token_surf(self, text):
        size = (TOKEN_R + 16) * 2
        s = pygame.Surface((size, size), pygame.SRCALPHA)
        c = size // 2
        for r in range(TOKEN_R + 16, TOKEN_R, -2):
            a = int(60 * (1 - (r - TOKEN_R) / 16))
            pygame.draw.circle(s, (*GOLD, a), (c, c), r)
        pygame.draw.circle(s, (28, 46, 38), (c, c), TOKEN_R)
        pygame.draw.circle(s, CHALK, (c, c), TOKEN_R, 3)
        label = self.f_math.render(text, True, CHALK)
        s.blit(label, label.get_rect(center=(c, c - 1)))
        return s

    def make_background(self, seed):
        rnd = random.Random(seed * 97 + 3)
        bg = pygame.Surface((W, H))
        bg.fill(BOARD)
        smudge = pygame.Surface((W, H), pygame.SRCALPHA)
        for _ in range(35):
            r = pygame.Rect(rnd.randint(-100, W), rnd.randint(-50, FLOOR_Y), rnd.randint(120, 380), rnd.randint(40, 140))
            pygame.draw.ellipse(smudge, (255, 255, 255, rnd.randint(4, 10)), r)
        bg.blit(smudge, (0, 0))
        for _ in range(11):
            txt = self.f_bg.render(rnd.choice(FORMULAS), True, CHALK)
            txt.set_alpha(rnd.randint(25, 45))
            bg.blit(txt, (rnd.randint(40, W - 360), rnd.randint(110, FLOOR_Y - 60)))
        # pár obrázkov kriedou: trojuholník a kružnica
        ghost = pygame.Surface((W, H), pygame.SRCALPHA)
        x0, y0 = rnd.randint(80, 500), rnd.randint(150, 380)
        pygame.draw.polygon(ghost, (*CHALK, 35), [(x0, y0 + 140), (x0 + 200, y0 + 140), (x0 + 200, y0)], 2)
        pygame.draw.circle(ghost, (*CHALK, 30), (rnd.randint(700, 1100), rnd.randint(180, 400)), rnd.randint(50, 90), 2)
        bg.blit(ghost, (0, 0))
        # knižnice v pozadí
        for bx in (rnd.randint(330, 480), rnd.randint(760, 980)):
            self.draw_bookcase(bg, bx, rnd)
        # drevený rám tabule
        pygame.draw.rect(bg, WOOD_D, (0, 0, W, H), 12)
        pygame.draw.rect(bg, WOOD, (0, 0, W, H), 6)
        return bg

    def draw_bookcase(self, surf, x, rnd):
        w, h = 110, 120
        top = FLOOR_Y - h
        pygame.draw.rect(surf, (70, 45, 25), (x, top, w, h))
        for shelf in range(3):
            sy = top + 8 + shelf * 38
            bx = x + 6
            while bx < x + w - 12:
                bw = rnd.randint(6, 12)
                bh = rnd.randint(22, 32)
                col = rnd.choice([(120, 50, 45), (60, 80, 110), (70, 100, 70), (150, 120, 70), (90, 60, 90)])
                pygame.draw.rect(surf, col, (bx, sy + 32 - bh, bw, bh))
                bx += bw + 1
            pygame.draw.rect(surf, WOOD_D, (x, sy + 32, w, 5))
        pygame.draw.rect(surf, WOOD_D, (x, top, w, h), 4)

    # ------------------------------------------------------------ pomocné
    def say(self, text, color=CHALK, dur=1.8):
        self.msg = [text, color, dur]

    def dust(self, x, y, n=14, color=CHALK):
        for _ in range(n):
            a = random.uniform(0, math.tau)
            v = random.uniform(40, 180)
            self.particles.append([x, y, math.cos(a) * v, math.sin(a) * v - 60, random.uniform(0.4, 0.9), color])

    def expression_text(self):
        out, k = [], 0
        for part in self.level["template"]:
            if part is None:
                out.append(self.tray[k].text if k < len(self.tray) else "□")
                k += 1
            else:
                out.append(part)
        return " ".join(out)

    def tray_value(self):
        if len(self.tray) < self.level["slots"]:
            return None
        return self.level["evaluate"]([t.text for t in self.tray])

    # ------------------------------------------------------------ akcie
    def collect(self, tok):
        tok.collected = True
        self.tray.append(tok)
        x, y = tok.pos(self.t)
        self.dust(x, y, 18, GOLD)
        pool = [t.text for t in self.tokens if not t.collected]
        if can_complete(self.level, [t.text for t in self.tray], pool):
            if len(self.tray) == self.level["slots"]:
                self.say("Výraz sedí! Hor sa k dverám.", GREEN, 2.5)
        else:
            self.dead = True
            self.mistakes += 1
            self.time_left -= PENALTY_S
            self.shake = 0.35
            self.say(f"{random.choice(MISTAKE_LINES)}  −{PENALTY_S} s   (E: guma, R: reset)", RED, 2.6)

    def try_pick(self):
        tok = self.near_token
        if tok is None:
            return
        if self.dead:
            self.say("Najprv oprav chybu: E guma, R reset", RED)
        elif len(self.tray) >= self.level["slots"]:
            self.say("Výraz je plný – choď k dverám alebo zmaž (E).", GOLD)
        else:
            self.collect(tok)
            self.near_token = None

    def use_eraser(self):
        if not self.tray:
            self.say("Nie je čo zmazať.")
        elif self.erasers <= 0:
            self.say("Gumy došli! Skús R (reset).", RED)
        else:
            tok = self.tray.pop()
            tok.collected = False
            tok.armed = False
            self.erasers -= 1
            self.dead = False
            self.dust(*tok.pos(self.t), 20, CHALK)
            self.say("Zmazané.")

    def restart_board(self):
        self.reset_board()
        self.say("Reset – ale čas beží ďalej!", GOLD)

    # ------------------------------------------------------------ update
    def handle_event(self, e):
        if e.type == pygame.QUIT:
            return False
        if e.type != pygame.KEYDOWN:
            return True
        if e.key == pygame.K_ESCAPE:
            return False
        if self.state == "title" and e.key in (pygame.K_RETURN, pygame.K_SPACE):
            self.score = 0
            self.load_level(0)
            self.state = "play"
        elif self.state == "play":
            if e.key in (pygame.K_SPACE, pygame.K_UP, pygame.K_w):
                self.player.jbuf = JUMP_BUFFER
            elif e.key in (pygame.K_DOWN, pygame.K_s):
                if self.player.on_ground and self.player.y + PLAYER_H < FLOOR_Y - 1:
                    self.player.drop = 0.22
            elif e.key == pygame.K_f:
                self.try_pick()
            elif e.key == pygame.K_e:
                self.use_eraser()
            elif e.key == pygame.K_r:
                self.restart_board()
        elif self.state == "complete" and e.key == pygame.K_RETURN:
            if self.level_i + 1 < len(LEVELS):
                self.load_level(self.level_i + 1)
                self.state = "play"
            else:
                self.state = "win"
        elif self.state == "over" and e.key == pygame.K_RETURN:
            self.load_level(self.level_i)
            self.state = "play"
        elif self.state == "win" and e.key == pygame.K_RETURN:
            self.state = "title"
        return True

    def update(self, dt):
        self.t += dt
        for p in self.particles:
            p[0] += p[2] * dt
            p[1] += p[3] * dt
            p[3] += 400 * dt
            p[4] -= dt
        self.particles = [p for p in self.particles if p[4] > 0]
        if self.msg:
            self.msg[2] -= dt
            if self.msg[2] <= 0:
                self.msg = None
        self.shake = max(0.0, self.shake - dt)
        self.msg_cd = max(0.0, self.msg_cd - dt)
        if self.state != "play":
            return

        self.time_left -= dt
        if self.time_left <= 0:
            self.time_left = 0
            self.state = "over"
            return

        p = self.player
        keys = pygame.key.get_pressed()
        dirx = (keys[pygame.K_RIGHT] or keys[pygame.K_d]) - (keys[pygame.K_LEFT] or keys[pygame.K_a])
        p.vx = dirx * SPEED
        if dirx:
            p.facing = dirx
            p.walk_t += dt
        p.coyote -= dt
        p.jbuf -= dt
        p.drop -= dt
        if p.jbuf > 0 and p.coyote > 0:
            p.vy = -JUMP_V
            p.jbuf = p.coyote = 0
        holding = keys[pygame.K_SPACE] or keys[pygame.K_UP] or keys[pygame.K_w]
        g = GRAVITY * (1.8 if p.vy < 0 and not holding else 1.0)   # krátky skok pri pustení
        p.vy = min(p.vy + g * dt, 1400)

        p.x = max(14, min(W - 14 - PLAYER_W, p.x + p.vx * dt))
        prev_bottom = p.y + PLAYER_H
        p.y += p.vy * dt
        was_ground = p.on_ground
        p.on_ground = False
        if p.vy >= 0:
            bottom = p.y + PLAYER_H
            if bottom >= FLOOR_Y:
                p.y, p.vy, p.on_ground = FLOOR_Y - PLAYER_H, 0, True
            elif p.drop <= 0:
                for rect, _ in self.platforms:
                    if (prev_bottom <= rect.top + 1 <= bottom + 1 and
                            p.x + PLAYER_W > rect.left + 4 and p.x < rect.right - 4):
                        p.y, p.vy, p.on_ground = rect.top - PLAYER_H, 0, True
                        break
        if p.on_ground:
            p.coyote = COYOTE_TIME
            if not was_ground:
                self.dust(p.x + PLAYER_W / 2, p.y + PLAYER_H, 6)

        # symbol na dosah (zoberie sa až klávesom F)
        cx, cy = p.center
        self.near_token = None
        best = TOKEN_R + 26
        for tok in self.tokens:
            if tok.collected:
                continue
            tx, ty = tok.pos(self.t)
            d = math.hypot(tx - cx, ty - cy)
            if not tok.armed:
                tok.armed = d > TOKEN_R + 70
                continue
            if d < best:
                best, self.near_token = d, tok

        # dvere
        if p.rect.colliderect(self.door):
            full = len(self.tray) == self.level["slots"]
            if full and not self.dead:
                bonus = int(self.time_left) * 10 + self.erasers * 50
                self.score += bonus
                self.last_bonus = bonus
                self.state = "complete"
                self.dust(self.door.centerx, self.door.top, 40, GREEN)
            elif self.msg_cd <= 0:
                self.say("Výraz ešte nie je hotový." if not full else "Toto nie je správne!", RED)
                self.msg_cd = 1.5

    # ------------------------------------------------------------ kreslenie
    def draw_platform(self, s, rect, kind):
        if kind == "desk":
            for lx in (rect.left + 10, rect.right - 20):
                pygame.draw.rect(s, WOOD_D, (lx, rect.bottom, 10, FLOOR_Y - rect.bottom))
            pygame.draw.rect(s, WOOD_D, (rect.left + 8, rect.bottom + 6, rect.width - 16, 18))
        else:
            for bx in (rect.left + 14, rect.right - 34):
                pygame.draw.polygon(s, WOOD_D, [(bx, rect.bottom), (bx + 20, rect.bottom), (bx + 10, rect.bottom + 40), (bx + 4, rect.bottom + 40)])
        pygame.draw.rect(s, WOOD, rect.inflate(0, 4), border_radius=3)
        pygame.draw.line(s, WOOD_L, (rect.left + 3, rect.top), (rect.right - 4, rect.top), 2)
        pygame.draw.line(s, WOOD_D, (rect.left + 2, rect.bottom + 1), (rect.right - 3, rect.bottom + 1), 2)

    def draw_door(self, s):
        d = self.door
        full = len(self.tray) == self.level["slots"] and not self.dead
        if full:
            glow = pygame.Surface((d.width + 80, d.height + 80), pygame.SRCALPHA)
            a = int(70 + 40 * math.sin(self.t * 4))
            pygame.draw.ellipse(glow, (*GREEN, a), glow.get_rect())
            s.blit(glow, (d.x - 40, d.y - 40))
        frame = d.inflate(18, 14).move(0, -7)
        pygame.draw.rect(s, (150, 150, 140), frame, border_top_left_radius=40, border_top_right_radius=40)
        pygame.draw.rect(s, (90, 55, 35), d, border_top_left_radius=34, border_top_right_radius=34)
        for i in range(1, 3):
            pygame.draw.line(s, (70, 42, 25), (d.x + i * d.width // 3, d.y + 20), (d.x + i * d.width // 3, d.bottom), 2)
        pygame.draw.circle(s, GOLD, (d.right - 14, d.centery + 10), 5)
        label = f"= {self.level['target_text']}" + (" !" if full else "?")
        txt = self.f_math_s.render(label, True, GREEN if full else CHALK)
        s.blit(txt, txt.get_rect(midbottom=(d.centerx, d.top - 12)))

    def draw_professor(self, s, x, y, facing, walking, airborne):
        cx = x + PLAYER_W // 2
        swing = math.sin(self.player.walk_t * 14) * 7 if walking and not airborne else 0
        if airborne:
            swing = 6
        # nohy
        for sgn in (-1, 1):
            pygame.draw.line(s, (45, 45, 55), (cx + sgn * 5, y + 40), (cx + sgn * 5 + sgn * swing, y + PLAYER_H - 2), 7)
            pygame.draw.ellipse(s, (30, 25, 25), (cx + sgn * 5 + sgn * swing - 6 + facing * 3, y + PLAYER_H - 6, 14, 7))
        # sako
        pygame.draw.rect(s, (125, 85, 50), (x + 3, y + 18, PLAYER_W - 6, 28), border_radius=8)
        pygame.draw.polygon(s, (235, 230, 215), [(cx - 4, y + 18), (cx + 4, y + 18), (cx, y + 30)])
        # ruka s kriedou
        hx, hy = cx + facing * 17, y + 30 - (8 if airborne else 0)
        pygame.draw.line(s, (125, 85, 50), (cx + facing * 8, y + 22), (hx, hy), 6)
        pygame.draw.rect(s, CHALK, (hx + (2 if facing > 0 else -8), hy - 4, 6, 4))
        # hlava
        pygame.draw.circle(s, (240, 205, 170), (cx + facing * 2, y + 10), 11)
        # vlasy (Einsteinovské chumáče)
        for dx, dy in ((-10, 4), (-12, 10), (10, 4), (12, 10), (-6, -1), (6, -1)):
            pygame.draw.circle(s, (245, 245, 245), (cx + facing * 2 + dx, y + 8 + dy), 4)
        # okuliare a fúzy
        ex = cx + facing * 6
        pygame.draw.circle(s, (40, 40, 40), (ex, y + 9), 3, 1)
        pygame.draw.circle(s, (40, 40, 40), (ex - facing * 7, y + 9), 3, 1)
        pygame.draw.line(s, (245, 245, 245), (ex - 6, y + 15), (ex + 3, y + 15), 3)

    def token_alpha(self, tok):
        """Čím viac chýb, tým menej vidno symboly ďaleko od profesora („dochádza mu trieda“)."""
        base = max(18, 255 - self.mistakes * 85)
        tx, ty = tok.pos(self.t)
        cx, cy = self.player.center
        d = math.hypot(tx - cx, ty - cy)
        near = max(0.0, min(1.0, 1 - (d - 90) / 140)) * 255
        return int(max(base, near))

    def draw_world(self):
        s = self.world
        s.blit(self.background, (0, 0))
        for rect, kind in self.platforms:
            self.draw_platform(s, rect, kind)
        pygame.draw.rect(s, WOOD_D, (0, FLOOR_Y, W, H - FLOOR_Y))
        pygame.draw.line(s, WOOD_L, (0, FLOOR_Y), (W, FLOOR_Y), 3)
        self.draw_door(s)
        p = self.player
        self.draw_professor(s, int(p.x), int(p.y), p.facing, p.vx != 0, not p.on_ground)
        for tok in self.tokens:
            if tok.collected:
                continue
            tx, ty = tok.pos(self.t)
            tok.surf.set_alpha(self.token_alpha(tok) if tok.armed else 90)
            s.blit(tok.surf, tok.surf.get_rect(center=(int(tx), int(ty))))
            if tok is self.near_token:
                pygame.draw.circle(s, GOLD, (int(tx), int(ty)), TOKEN_R + 4, 2)
                hint = self.f_chalk_s.render("F – zobrať", True, GOLD)
                s.blit(hint, hint.get_rect(midbottom=(int(tx), int(ty) - TOKEN_R - 6)))
        for x, y, _, _, life, col in self.particles:
            pygame.draw.circle(s, col, (int(x), int(y)), 2 if life > 0.3 else 1)

    def draw_tray(self):
        s = self.screen
        parts = []
        k = 0
        for part in self.level["template"]:
            if part is None:
                parts.append(("slot", k))
                k += 1
            else:
                parts.append(("text", self.f_math_s.render(part, True, CHALK)))
        label = self.f_chalk.render("VÝRAZ:", True, CHALK)
        widths = [54 if kind == "slot" else v.get_width() for kind, v in parts]
        total = label.get_width() + 16 + sum(widths) + 8 * (len(parts) - 1) + 130
        x = (W - total) // 2
        panel = pygame.Rect(x - 16, FLOOR_Y + 12, total + 32, 72)
        pygame.draw.rect(s, (24, 38, 32), panel, border_radius=10)
        pygame.draw.rect(s, CHALK_DIM, panel, 2, border_radius=10)
        cy = panel.centery
        s.blit(label, label.get_rect(midleft=(x, cy)))
        x += label.get_width() + 16
        for (kind, v), w in zip(parts, widths):
            if kind == "slot":
                r = pygame.Rect(x, cy - 26, 54, 52)
                filled = v < len(self.tray)
                bad = self.dead and v == len(self.tray) - 1
                col = RED if bad else (CHALK if filled else CHALK_DIM)
                pygame.draw.rect(s, col, r, 2, border_radius=6)
                if filled:
                    t = self.f_math.render(self.tray[v].text, True, col)
                    s.blit(t, t.get_rect(center=r.center))
            else:
                s.blit(v, v.get_rect(midleft=(x, cy)))
            x += w + 8
        val = self.tray_value()
        if val is not None:
            ok = val == self.level["target"]
            t = self.f_math.render(f"= {frac_str(val)}", True, GREEN if ok else RED)
            s.blit(t, t.get_rect(midleft=(x + 6, cy)))

    def draw_hud(self):
        s = self.screen
        lvl = self.level
        t = self.f_chalk_l.render(f"CIEĽ:  = {lvl['target_text']}", True, CHALK)
        s.blit(t, (30, 14))
        pygame.draw.line(s, CHALK, (30, 70), (30 + t.get_width(), 72), 2)
        sub = self.f_chalk_s.render(f"{lvl['name']}  ·  {lvl['subtitle']}", True, CHALK_DIM)
        s.blit(sub, (32, 78))

        tcol = RED if self.time_left < 10 and int(self.t * 4) % 2 == 0 else CHALK
        lines = [
            (self.f_chalk_l.render(f"ČAS: {math.ceil(self.time_left)}", True, tcol)),
            (self.f_chalk.render("GUMA (E): " + "[x]" * self.erasers + "[ ]" * (ERASERS - self.erasers), True, CHALK)),
            (self.f_chalk_s.render(f"RESET: R   ·   Chyby: {self.mistakes}   ·   Skóre: {self.score}", True, CHALK_DIM)),
        ]
        y = 12
        for img in lines:
            s.blit(img, img.get_rect(topright=(W - 30, y)))
            y += img.get_height() - 4
        s.blit(self.f_chalk_s.render("Q.E.D.", True, CHALK_DIM), (24, FLOOR_Y - 34))

        if self.msg:
            text, col, left = self.msg
            img = self.f_chalk.render(text, True, col)
            img.set_alpha(int(255 * min(1, left * 2)))
            s.blit(img, img.get_rect(center=(W // 2, 172)))

    def draw_overlay(self, title, lines, title_col=CHALK):
        dim = pygame.Surface((W, H), pygame.SRCALPHA)
        dim.fill((10, 20, 15, 170))
        self.screen.blit(dim, (0, 0))
        img = self.f_chalk_xl.render(title, True, title_col)
        self.screen.blit(img, img.get_rect(center=(W // 2, H // 2 - 110)))
        y = H // 2 - 20
        for i, line in enumerate(lines):
            f = self.f_math if i == 0 else self.f_chalk
            img = f.render(line, True, CHALK)
            self.screen.blit(img, img.get_rect(center=(W // 2, y)))
            y += 48

    def draw(self):
        if self.state == "title":
            self.screen.blit(self.background, (0, 0))
            self.draw_overlay("Q.E.D.", [
                "Quod Erat Demonstrandum – profesorova skákačka",
                "Zbieraj čísla a znamienka v správnom poradí tak, aby výraz dal CIEĽ.",
                "Zlý symbol = −3 s a trieda sa ti začne strácať pred očami.",
                "← →  ·  skok: Medzera  ·  F: zobrať  ·  E: guma  ·  R: reset  ·  ↓: zoskočiť",
                "ENTER – začať",
            ], GOLD)
            self.draw_professor(self.screen, W // 2 - 17, 120, 1, False, False)
            pygame.display.flip()
            return

        self.draw_world()
        off = (0, 0)
        if self.shake > 0:
            off = (random.randint(-6, 6), random.randint(-4, 4))
        self.screen.fill((0, 0, 0))
        self.screen.blit(self.world, off)
        self.draw_tray()
        self.draw_hud()

        if self.state == "complete":
            nxt = "ENTER – ďalší level" if self.level_i + 1 < len(LEVELS) else "ENTER – finále"
            self.draw_overlay("Q.E.D. ■", [
                f"{self.expression_text()} = {self.level['target_text']}",
                f"Bonus: +{self.last_bonus}   ·   Skóre: {self.score}", nxt,
            ], GREEN)
        elif self.state == "over":
            self.draw_overlay("Čas vypršal!", [
                f"{self.expression_text()}", "Zvonilo... ENTER – skúsiť znova, Esc – koniec",
            ], RED)
        elif self.state == "win":
            self.draw_overlay("Všetko dokázané!", [
                f"Celkové skóre: {self.score}", "ENTER – späť na úvod",
            ], GOLD)
        pygame.display.flip()

    # ------------------------------------------------------------ slučka
    def run(self):
        running = True
        while running:
            dt = min(self.clock.tick(60) / 1000.0, 1 / 30)
            for e in pygame.event.get():
                running = running and self.handle_event(e)
            self.update(dt)
            self.draw()
        pygame.quit()


def screenshots(out_dir):
    """Vyrenderuje náhľady všetkých levelov (na kontrolu bez okna)."""
    os.makedirs(out_dir, exist_ok=True)
    g = Game()
    g.draw()
    pygame.image.save(g.screen, os.path.join(out_dir, "title.png"))
    for i in range(len(LEVELS)):
        g.load_level(i)
        g.state = "play"
        for _ in range(30):
            g.update(1 / 60)
        g.draw()
        pygame.image.save(g.screen, os.path.join(out_dir, f"level{i + 1}.png"))
    # ukážka chyby a vyriešeného levelu
    g.load_level(0)
    g.state = "play"
    by_text = {}
    for tok in g.tokens:
        by_text.setdefault(tok.text, tok)
    g.collect(by_text["2"])
    g.collect(by_text["−"])
    g.draw()
    pygame.image.save(g.screen, os.path.join(out_dir, "mistake.png"))
    g.load_level(3)
    g.state = "play"
    for txt in ("3", "2"):
        g.collect(next(t for t in g.tokens if t.text == txt and not t.collected))
    g.collect(next(t for t in g.tokens if t.text == "2" and not t.collected))
    g.last_bonus = 0
    g.state = "complete"
    g.draw()
    pygame.image.save(g.screen, os.path.join(out_dir, "complete.png"))
    pygame.quit()


if __name__ == "__main__":
    validate_levels()
    if "--screenshots" in sys.argv:
        screenshots(sys.argv[sys.argv.index("--screenshots") + 1])
    else:
        Game().run()
