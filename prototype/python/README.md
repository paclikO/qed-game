# Q.E.D. – profesorova skákačka

Plošinovka v Pythone (pygame-ce). Profesor skáče po laviciach a poličkách v triede
a zbiera čísla a znamienka **v správnom poradí**, aby výraz dole dal **CIEĽ**.
Keď je výraz hotový a správny, dvere sa rozsvietia – dobehni k nim.

> **Prototyp.** Táto Python verzia slúži na rýchle odskúšanie mechaník a levelov.
> Cieľová verzia hry má byť podľa `AGENTS.md` v HTML5 Canvas + JavaScript (GitHub Pages);
> pravidlá, penalizácie a levely odtiaľto sa dajú preniesť takmer 1:1.

## Spustenie

```powershell
python -m pip install pygame-ce
python qed.py
```

## Ovládanie

| Kláves | Akcia |
|---|---|
| ← → / A D | pohyb |
| Medzera / ↑ / W | skok (dlhšie držanie = vyšší skok) |
| ↓ / S | zoskočiť z poličky |
| F | zobrať symbol, pri ktorom profesor stojí (cez ostatné sa dá prejsť) |
| E | guma – vráti posledný symbol na miesto (2× na level) |
| R | reset levelu (čas beží ďalej) |
| Esc | koniec |

## Penalizácie

- Zlý symbol = taký, s ktorým sa už cieľ **nedá** dosiahnuť (hra to počíta sama,
  takže level môže mať viac správnych riešení).
- Za chybu: **−3 s**, symbol sa zafarbí na červeno a kým ho nezmažeš (E) alebo
  nedáš reset (R), nič ďalšie nezoberieš.
- „Dochádza mu trieda“: s každou chybou sú vzdialené symboly menej viditeľné –
  plne ich vidno len blízko profesora, treba si pamätať, kde čo bolo.
- Keď dôjde čas, level sa opakuje. Zvyšný čas a nepoužité gumy = bonusové skóre.

## Levely (`levels.py`)

1. Aritmetika (prednosť operátorov) · 2. Aritmetika s delením · 3. Mocniny ·
4. Derivácie · 5. Integrály · 6. Pravdepodobnosť

Nový level = nový slovník v zozname `LEVELS` (popis polí je na začiatku súboru).
Pri štarte hra overí, že každý level má riešenie.
`python qed.py --screenshots nahlady` vyrenderuje náhľady levelov do PNG.

Konštanty ako `PENALTY_S`, `ERASERS`, `GRAVITY` či `JUMP_V` sú na začiatku `qed.py`.
