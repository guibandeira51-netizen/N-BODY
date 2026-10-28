"""Reproduce the 1.0.1 scientific figures from measured records only.

Requires Python 3, numpy and matplotlib. Run from any directory:
    python scripts/validation-101/plot.py
No orbit is integrated and no historical record is modified. Every plotted
measurement is also written to a CSV beside its PNG/SVG. Historical direct
energy values remain unconnected markers at their saved snapshots.
"""
from __future__ import annotations

import csv
import hashlib
import json
import math
import textwrap
from datetime import datetime, timezone
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / "reports/v1.0.1"
OUT = REPORT / "figures"
OUT.mkdir(parents=True, exist_ok=True)
KM_S = 1 / 0.001022712165045695
ENERGY_J = 1.9010741942186524e52
COLORS = ["#176c87", "#d37a25", "#41835e", "#a14d74", "#665fa6", "#806942"]
COMPONENTS = {0: "Bojo", 1: "Disco", 2: "Halo"}
SOURCE_HASHES = {}
FIGURES = []
ROWS = []
ACTIVE_FIGURE = ""

plt.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": 10, "axes.titlesize": 11,
    "axes.labelsize": 10, "xtick.labelsize": 9, "ytick.labelsize": 9,
    "legend.fontsize": 8, "axes.spines.top": False, "axes.spines.right": False,
    "axes.grid": True, "grid.alpha": .22, "grid.linewidth": .6,
    "lines.linewidth": 1.6, "savefig.facecolor": "white", "figure.facecolor": "white",
    "svg.fonttype": "none", "axes.formatter.use_mathtext": True,
})


def read(path):
    path = Path(path)
    if not path.is_absolute():
        path = ROOT / path
    raw = path.read_bytes()
    SOURCE_HASHES[path.relative_to(ROOT).as_posix()] = hashlib.sha256(raw).hexdigest()
    return json.loads(raw)


def finite(value):
    return isinstance(value, (int, float)) and math.isfinite(value)


def time_of(row):
    return row.get("timeMyr", row.get("time"))


def component(sample, component_id, subpopulation=False):
    name = "subpopulationStructure" if subpopulation else "structure"
    return next((item for item in sample.get(name, {}).get("components", [])
                 if item.get("id") == component_id), {})


def compact_sample(sample, profiles=False):
    result = {"time": time_of(sample), "n": sample.get("n"),
              "disk": sample.get("disk", {}), "populations": sample.get("populations", {})}
    # Retain only measured values needed by the figures, never particle arrays.
    result["disk"] = {key: result["disk"].get(key) for key in ["instant", "fixed", "plane"]}
    result["populations"] = {name: {key: value.get(key) for key in ["instant", "fixed", "plane"]}
                             for name, value in result["populations"].items()}
    for source, destination in [("structure", "components"), ("subpopulationStructure", "subcomponents")]:
        result[destination] = {}
        for item in sample.get(source, {}).get("components", []):
            result[destination][item["id"]] = {key: item.get(key) for key in ["r50", "R50", "velocity", "name"]}
            if profiles:
                result[destination][item["id"]]["profiles"] = item.get("profiles", {})
    return result


def compact_energy(row):
    keys = ["kinetic", "selfPotential", "externalPotential", "potential", "energy", "deltaEnergy",
            "Lx", "Ly", "Lz", "Lnorm", "angularMomentumNorm", "angularMomentumScaledError",
            "deltaLzRelative", "deltaLzScaled", "energyApproximate", "energyMethod"]
    result = {key: row.get(key) for key in keys}
    result["time"] = time_of(row)
    angular = row.get("angularMomentum", [])
    if len(angular) == 3:
        for key, value in zip(["Lx", "Ly", "Lz"], angular):
            if result[key] is None:
                result[key] = value
        if result["Lnorm"] is None:
            result["Lnorm"] = math.hypot(*angular)
    return result


def load_run(path, historical=False):
    data = read(path)
    if data.get("status") not in (None, "completed"):
        return None
    raw_samples = data.get("samples", [])
    samples = [compact_sample(row, i in (0, len(raw_samples)-1)) for i, row in enumerate(raw_samples)]
    if "energySeries" in data:
        energy = [compact_energy(row) for row in data["energySeries"]]
    else:
        energy = [compact_energy({**row.get("conservation", {}), "time": time_of(row)}) for row in raw_samples]
    baseline = energy[0].get("energy") if energy else None
    for row in energy:
        if row.get("deltaEnergy") is None and finite(baseline) and baseline != 0 and finite(row.get("energy")):
            row["deltaEnergy"] = (row["energy"] - baseline) / abs(baseline)
    config = data.get("config", {})
    return {"id": data.get("id", Path(path).stem), "config": config, "samples": samples,
            "energy": energy, "historical": historical, "origin": data.get("origin", "historical-1.0.0"),
            "sources": [Path(path).as_posix()], "summary": data.get("conservation", {}),
            "n": config.get("n", samples[0].get("n") if samples else None)}


def load_reanalysis(path):
    data = read(path)
    direct = data.get("directSnapshots", [])
    source = Path(path).as_posix()
    result = {"id": data.get("id", Path(path).stem), "config": data.get("config", {}),
              "samples": [compact_sample(row["structure"], i in (0, len(direct)-1)) for i, row in enumerate(direct)],
              "energy": [compact_energy(row["conservation"]) for row in direct],
              "approximate": [compact_energy(row) for row in data.get("historicalApproximateSeries", [])],
              "historical": True, "sparseDirect": True, "origin": data.get("origin"), "sources": [source],
              "summary": data.get("directSummary", {})}
    result["n"] = result["samples"][0].get("n") if result["samples"] else None
    return result


def points(run, getter, kind="samples", max_time=None):
    if not run:
        return []
    output = []
    for row in run.get(kind, []):
        x, y = row.get("time"), getter(row)
        if finite(x) and finite(y) and (max_time is None or x <= max_time + 1e-8):
            output.append((x, y))
    return output


def h50(sample, population="disk"):
    group = sample.get("disk", {}) if population == "disk" else sample.get("populations", {}).get(population, {})
    return (group.get("instant") or {}).get("h50")


def comp_value(sample, component_id, key):
    return sample.get("components", {}).get(component_id, {}).get(key)


def dispersion(sample, population_id, direction):
    values = sample.get("subcomponents", {}).get(population_id, {}).get("velocity", {}) or {}
    values = values.get("dispersion") or []
    return values[direction] * KM_S if len(values) > direction and finite(values[direction]) else None


def begin(name, title, subtitle, rows=1, cols=1, width=13.4, height=None):
    global ACTIVE_FIGURE, ROWS
    ACTIVE_FIGURE, ROWS = name, []
    fig, axes = plt.subplots(rows, cols, figsize=(width, height or (4.5 if rows == 1 else 7.8)), squeeze=False)
    fig.suptitle(title, x=.06, ha="left", y=.985, fontsize=16, fontweight="semibold")
    fig.text(.06, .927, subtitle, fontsize=9.5, color="#46545b", ha="left", va="top")
    fig.subplots_adjust(left=.08, right=.97, top=.84 if rows == 1 else .86,
                        bottom=.23 if rows == 1 else .19, wspace=.31, hspace=.48)
    return fig, axes


def line(ax, values, label, color=0, style="-", marker=None, unit="", panel="", scatter=False):
    values = [(x, y) for x, y in values if finite(x) and finite(y)]
    if not values:
        return False
    x, y = zip(*values)
    color = COLORS[color % len(COLORS)] if isinstance(color, int) else color
    if scatter:
        ax.scatter(x, y, label=label, c=color, s=30, marker=marker or "o", zorder=5)
    else:
        ax.plot(x, y, label=label, color=color, linestyle=style, marker=marker, markersize=3.5)
    for x_value, y_value in values:
        ROWS.append({"figure": ACTIVE_FIGURE, "panel": panel or ax.get_title(), "series": label,
                     "x": x_value, "x_unit": "Myr", "y": y_value, "y_unit": unit,
                     "display": "unconnected measured snapshots" if scatter else "recorded samples"})
    return True


def finish(fig, axes, name, title, description, note, runs):
    for row in axes:
        for ax in row:
            handles, labels = ax.get_legend_handles_labels()
            if handles:
                ax.legend(loc="best", framealpha=.94, edgecolor="#d4dadd")
            else:
                ax.text(.5, .5, "Sem série disponível para este domínio", transform=ax.transAxes, ha="center", fontsize=10)
            if not ax.get_xlabel():
                ax.set_xlabel("Tempo [Myr]")
    footer = "\n".join(textwrap.wrap(note, 145))
    fig.text(.06, .04, footer, fontsize=8.7, color="#44525a", va="bottom", linespacing=1.5)
    png, svg, table = OUT/f"{name}.png", OUT/f"{name}.svg", OUT/f"{name}.csv"
    fig.savefig(png, dpi=200, metadata={"Title": title, "Description": description, "Software": "validation-101/plot.py; matplotlib"})
    fig.savefig(svg, metadata={"Title": title, "Description": description})
    plt.close(fig)
    with table.open("w", newline="", encoding="utf-8-sig") as stream:
        fields = ["figure", "panel", "series", "x", "x_unit", "y", "y_unit", "display"]
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(ROWS)
    sources = sorted({source for run in runs if run for source in run.get("sources", [])})
    FIGURES.append({"id": name, "title": title, "path": png.relative_to(ROOT).as_posix(),
                    "svgPath": svg.relative_to(ROOT).as_posix(), "dataPath": table.relative_to(ROOT).as_posix(),
                    "description": description, "limitations": note, "plottedMeasurements": len(ROWS),
                    "sources": [{"path": source, "sha256": SOURCE_HASHES.get(source)} for source in sources]})
    print(f"{name}: {len(ROWS)} measured values, PNG + SVG + CSV", flush=True)


RUNS = {}
for path in sorted((REPORT/"runs").glob("*.json")):
    run = load_run(path.relative_to(ROOT))
    if run:
        RUNS[run["id"]] = run
GPU = {}
for path in sorted((REPORT/"gpu").glob("*.json")):
    run = load_run(path.relative_to(ROOT))
    if run and run["energy"]:
        GPU[run["id"]] = run
REANALYSIS = {}
for path in sorted(REPORT.glob("historical-reanalysis-*.json")):
    run = load_reanalysis(path.relative_to(ROOT))
    REANALYSIS[run["id"]] = run
HISTORY = {}
for name in ["df-A-10k", "df-A-50k", "calibrated-A-10k", "calibrated-A-50k", "df-fixed", "calibrated-fixed"]:
    path = Path("reports/v1.0.0/runs") / f"{name}.json"
    if (ROOT/path).exists():
        HISTORY[name] = load_run(path, historical=True)

C = RUNS.get("C-f64-dt0.05")
B = RUNS.get("B-fixed-f64")
A = RUNS.get("A-continuum-agama-calibrated")
A_ORIGINAL = RUNS.get("A-continuum-agama")
D = RUNS.get("D-halo-refined-f64")
E = RUNS.get("E-baryons-refined-f64")
DIRECT = [RUNS.get("C-f64-dt"+str(dt)) for dt in [.1, .05, .025]]
BINARY = [RUNS.get("binary-dt"+str(dt)) for dt in [.1, .05, .025]]
BH = [RUNS.get("C-bh-theta"+str(theta)) for theta in [.5, .25]]
GPUDT = [GPU.get("GPU-1000-dt"+str(dt)) for dt in [.1, .05, .025]]
H = REANALYSIS.get("calibrated-A-10k")

# 1. Different Hamiltonians occupy separate panels.
fig, axes = begin("energy-terms", "Energia cinética, potencial e total", "Hamiltonianas explicitadas por experimento; valores físicos convertidos para joules.", 2, 2)
term_runs = [(C, "C · isolado, N = 1.000, CPU f64"), (B, "B · halo fixo, 600 bárions móveis"),
             (A, "A · campo AGAMA contínuo, 1 Gyr"), (GPUDT[1] or RUNS.get("C-original-f64"), "C · GPU f32, N = 1.000" if GPUDT[1] else "C · AGAMA original, CPU f64")]
for ax, (run, label) in zip(axes.flat, term_runs):
    ax.set_title(label)
    for color, key, term in [(0, "kinetic", "K"), (1, "potential", "U total"), (2, "energy", "E = K + U")]:
        line(ax, points(run, lambda row, key=key: row[key]*ENERGY_J/1e52 if finite(row.get(key)) else None, "energy"), term, color, unit="1e52 J")
    if run and any(abs(row.get("externalPotential") or 0) > 0 for row in run["energy"]):
        line(ax, points(run, lambda row: row["externalPotential"]*ENERGY_J/1e52 if finite(row.get("externalPotential")) else None, "energy"), "U externo (já incluído em U)", 3, "--", unit="1e52 J")
    ax.set_ylabel("Energia [10⁵² J]")
finish(fig, axes, "energy-terms", "Energia cinética, potencial e total", "Séries reais de K, U e E em Hamiltonianas distintas: isolada, halo fixo e campo contínuo.", "No halo fixo e no campo de teste, U externo entra sem fator 1/2. O controle A usa partículas de teste e DOP853; não é uma integração autogravitante KDK. Conservação energética não certifica equilíbrio estrutural.", [item[0] for item in term_runs])

# 2. No final-only energy metric, and no interpolation of sparse direct sums.
fig, axes = begin("energy-error", "Erro relativo assinado da energia", "δE(t) = [E(t) − E(0)] / |E(0)|; cada curva usa sua própria condição inicial efetivamente integrada.", 2, 2)
groups = [(DIRECT, "C · CPU direto f64 · 20 Myr", "dt"), (BH, "C · força Barnes–Hut, energia direta f64", "theta"),
          (GPUDT, "C · GPU f32, energia direta f64 · 20 Myr", "dt")]
for ax, (group, title, parameter) in zip(axes.flat, groups):
    ax.set_title(title)
    for i, run in enumerate(group):
        if run:
            line(ax, points(run, lambda row: row.get("deltaEnergy"), "energy"), f"{'θ' if parameter=='theta' else 'dt'} = {run['config'].get(parameter)}" + (" Myr" if parameter=="dt" else ""), i, unit="dimensionless")
    ax.axhline(0, color="#7d8588", lw=.6)
    ax.set_ylabel("δE [adimensional]")
ax = axes[1, 1]
ax.set_title("Trajetória histórica calibrada · N = 10.000")
if H:
    line(ax, points(H, lambda row: row.get("deltaEnergy"), "approximate"), "BH f64 · diagnóstico histórico a cada 5 Myr", 3, unit="dimensionless")
    line(ax, points(H, lambda row: row.get("deltaEnergy"), "energy"), "Soma direta f64 · snapshots preservados", 0, scatter=True, unit="dimensionless")
ax.set_ylabel("δE [adimensional]")
finish(fig, axes, "energy-error", "Erro relativo assinado da energia", "Comparação temporal de erros energéticos medidos em CPU, GPU e trajetória histórica.", "Os pontos diretos históricos não são unidos: foram calculados somente nos snapshots salvos. Seu máximo é um limite inferior do máximo entre snapshots. A curva BH histórica é uma estimativa aproximada e tem sua própria referência E(0).", DIRECT+BH+GPUDT+[H])

# 3. Measured maxima only; binary control separated from the galactic draw.
fig, axes = begin("energy-dt", "Erro máximo da energia e passo temporal", "Máximo de |δE| entre os instantes medidos; uma semente e a mesma realização dentro de cada comparação.", 1, 2, height=5.0)
for ax, groups, title in [(axes[0, 0], [(BINARY, "Binário Plummer · CPU f64", 0)], "Controle de duas partículas · 200 Myr"),
                          (axes[0, 1], [(DIRECT, "N = 1.000 · CPU direto f64", 0), (GPUDT, "N = 1.000 · GPU direto f32", 1)], "Realização galáctica · 20 Myr")]:
    ax.set_title(title)
    for group, label, color in groups:
        values = []
        for run in group:
            if run:
                measured = [abs(row["deltaEnergy"]) for row in run["energy"] if finite(row.get("deltaEnergy"))]
                if measured:
                    values.append((run["config"]["dt"], max(measured)))
        line(ax, sorted(values), label, color, marker="o", unit="dimensionless")
    ax.set_xscale("log"); ax.set_yscale("log")
    ax.set_xlabel("Passo temporal dt [Myr]"); ax.set_ylabel("máx |δE| [adimensional]")
    ax.set_xticks([.025, .05, .1], labels=["0,025", "0,05", "0,1"])
for row in ROWS:
    row["x_unit"] = "Myr (dt)"
finish(fig, axes, "energy-dt", "Erro máximo da energia e passo temporal", "Máximos efetivamente medidos em três passos temporais, com separação entre o binário e a realização galáctica.", "CPU e GPU de N = 1.000 têm diagnóstico direto f64 a cada passo. O binário testa o integrador; sua ordem observada não pode ser transferida automaticamente ao problema galáctico. Nenhuma linha teórica ou barra de incerteza foi fabricada.", BINARY+DIRECT+GPUDT)

# 4. Global disk plus the unchanged AGAMA thin/thick identities.
fig, axes = begin("disk-thickness", "Espessura do disco durante a evolução", "h₅₀ = mediana ponderada por massa de |z| em relação ao plano instantâneo de cada população; ensaios novos.", 1, 3, height=5.0)
structural_runs = [(A, "A · contínuo"), (B, "B · halo fixo"), (C, "C · halo dinâmico"), (D, "D · halo refinado"), (E, "E · bárions refinados")]
for ax, population, title in zip(axes.flat, ["disk", "thin", "thick"], ["Disco combinado", "Disco fino", "Disco espesso"]):
    ax.set_title(title)
    for color, (run, label) in enumerate(structural_runs):
        line(ax, points(run, lambda row, pop=population: h50(row, pop), max_time=20), label, color, unit="kpc")
    ax.set_ylabel("h₅₀ [kpc]")
finish(fig, axes, "disk-thickness", "Espessura do disco durante a evolução", "Espessuras global, fina e espessa medidas separadamente nos experimentos A–E novos.", "As identidades fino/espesso provêm do snapshot AGAMA original e não são inferidas da altura atual. Os planos são ajustados separadamente. O recorte comum de 20 Myr é curto: não estabelece estabilidade durante vários períodos orbitais.", [item[0] for item in structural_runs])

# 5. Actual cylindrical velocity dispersions; km/s is explicit.
fig, axes = begin("velocity-dispersion", "Dispersões de velocidade das populações estelares", "Momentos ponderados por massa em coordenadas cilíndricas do referencial fixo; valores convertidos de kpc/Myr para km/s.", 2, 3, height=8.2)
for row_index, (population_id, population) in enumerate([(1, "Disco fino"), (2, "Disco espesso")]):
    for direction, symbol in enumerate(["σR", "σφ", "σz"]):
        ax = axes[row_index, direction]
        ax.set_title(f"{population} · {symbol}")
        for color, (run, label) in enumerate(structural_runs):
            line(ax, points(run, lambda row, p=population_id, d=direction: dispersion(row, p, d), max_time=20), label, color, unit="km/s")
        ax.set_ylabel(f"{symbol} [km/s]")
finish(fig, axes, "velocity-dispersion", "Dispersões de velocidade das populações estelares", "Séries independentes de σR, σφ e σz dos discos fino e espesso nos ensaios A–E.", "σz é a dispersão no eixo z fixo e não é automaticamente igual à dispersão normal do plano ajustado. A separação permite investigar aquecimento, inclinação e redistribuição sem alterar velocidades durante a evolução. Uma realização por configuração; sem incerteza entre sementes estimada.", [item[0] for item in structural_runs])

# 6. N=10k/50k historical data and genuinely new 200 Myr GPU trajectories.
fig, axes = begin("resolution-thickness", "Espessura e número de partículas", "Comparação de resoluções a dt = 0,1 Myr e ε = 0,1 kpc; distinguir a campanha histórica das novas integrações.", 1, 2, height=5.1)
resolution_runs = []
for ax, prefix, title in [(axes[0, 0], "df", "AGAMA original · histórico 1.0"), (axes[0, 1], "calibrated", "AGAMA com calibração vertical")]:
    ax.set_title(title)
    for color, amount in enumerate(["10k", "50k"]):
        run = HISTORY.get(f"{prefix}-A-{amount}")
        resolution_runs.append(run)
        line(ax, points(run, lambda row: h50(row), max_time=200), f"N = {'10.000' if amount=='10k' else '50.000'} · histórico", color, unit="kpc")
    if prefix == "calibrated":
        for color, n in enumerate([10000, 50000]):
            run = GPU.get(f"GPU-{n}-200Myr")
            resolution_runs.append(run)
            line(ax, points(run, lambda row: h50(row), max_time=200), f"N = {n:,}".replace(",", ".")+" · novo 1.0.1", color+2, "--", unit="kpc")
    ax.set_ylabel("h₅₀ global instantâneo [kpc]")
finish(fig, axes, "resolution-thickness", "Espessura e número de partículas", "Medições reais de h50 em realizações de 10 mil e 50 mil partículas, preservando a distinção entre campanhas.", "Realizações com sementes comuns não são estados de partículas idênticos ao mudar N. As linhas unem amostras estruturais registradas; o limite comum é 200 Myr. Esta comparação de uma semente não demonstra, sozinha, convergência estatística ou explica todo o aquecimento.", resolution_runs)

# 7. Cylindrical disk R50 and spherical bulge r50 are never interchanged.
fig, axes = begin("half-mass", "Evolução dos raios de meia massa", "Disco: raio cilíndrico R₅₀. Bojo: raio esférico r₅₀. Quantis empíricos ponderados por massa.", 2, 2)
half_runs = [run for run, _ in structural_runs]
for col, (cid, key, title) in enumerate([(1, "R50", "Disco · R₅₀ cilíndrico"), (0, "r50", "Bojo · r₅₀ esférico")]):
    ax = axes[0, col]; ax.set_title(title+" · novos ensaios")
    for color, (run, label) in enumerate(structural_runs):
        line(ax, points(run, lambda row, c=cid, k=key: comp_value(row, c, k), max_time=20), label, color, unit="kpc")
    ax.set_ylabel("Raio de meia massa [kpc]")
    ax = axes[1, col]; ax.set_title(title+" · histórico")
    for color, (name, label) in enumerate([("df-A-10k", "Original · N = 10.000"), ("calibrated-A-10k", "Calibrado · N = 10.000"), ("calibrated-A-50k", "Calibrado · N = 50.000")]):
        run = HISTORY.get(name); half_runs.append(run)
        line(ax, points(run, lambda row, c=cid, k=key: comp_value(row, c, k)), label, color, unit="kpc")
    ax.set_ylabel("Raio de meia massa [kpc]")
finish(fig, axes, "half-mass", "Evolução dos raios de meia massa", "Raios de meia massa do disco e bojo acompanhados separadamente, em intervalos novos e históricos.", "Cada curva termina no último instante registrado: algumas campanhas alcançam 200 Myr, outras 1 Gyr. Um raio de meia massa aproximadamente constante não exclui aquecimento vertical ou redistribuição dentro dos anéis.", half_runs)

# 8. Initial/final measured density bins; empty and overflow bins are excluded.
density_run = H or C
fig, axes = begin("density-profiles", "Perfis de densidade inicial e final", ("Trajetória histórica calibrada reanalisada" if H else "Ensaio novo CPU f64")+" · posições preservadas; perfis no referencial fixo.", 2, 3, height=8.4)
profile_samples = density_run["samples"] if density_run else []
for col, cid in enumerate([0, 1, 2]):
    for row_index, profile in enumerate(["cylindrical" if cid == 1 else "spherical", "vertical"]):
        ax = axes[row_index, col]
        is_surface = profile == "cylindrical"
        ax.set_title(COMPONENTS[cid]+(" · radial" if row_index == 0 else " · vertical, R < 30 kpc"))
        for color, index in [(0, 0), (1, -1)]:
            if not profile_samples:
                continue
            sample = profile_samples[index]
            bins = sample.get("components", {}).get(cid, {}).get("profiles", {}).get(profile, {}).get("bins", [])
            values = [((item["lower"]+item["upper"])/2, item["density"]*1e10) for item in bins
                      if finite(item.get("upper")) and finite(item.get("density")) and item["density"] > 0]
            line(ax, values, f"t = {sample['time']:g} Myr", color, marker="o", unit="Msun/kpc^2" if is_surface else "Msun/kpc^3")
        ax.set_yscale("log"); ax.set_xscale("log")
        ax.set_xlabel(("R" if is_surface else "r")+" [kpc]" if row_index == 0 else "|z| [kpc]")
        ax.set_ylabel("Σ [M☉/kpc²]" if is_surface else "ρ [M☉/kpc³]")
for row in ROWS:
    row["x_unit"] = "kpc (bin midpoint)"
finish(fig, axes, "density-profiles", "Perfis de densidade inicial e final", "Perfis radiais e verticais medidos para bojo, disco e halo, com geometrias e unidades distintas.", "Os pontos são médias em bins finitos; bins vazios e de transbordamento sem densidade definida são omitidos da escala logarítmica. O perfil radial do disco é densidade superficial integrada em z; os demais são densidades volumétricas. Não há ajuste a um perfil teórico nem barras estatísticas inferidas.", [density_run])

# 9. Components of L and the quantities actually expected to be conserved.
fig, axes = begin("angular-momentum", "Evolução do momento angular", "L = Σ m(r × v), na origem inercial especificada; energia e momento angular são diagnósticos distintos.", 2, 2)
for ax, run, title in [(axes[0, 0], C, "C · sistema isolado, CPU f64"), (axes[0, 1], B, "B · halo externo fixo, CPU f64")]:
    ax.set_title(title)
    for color, key in enumerate(["Lx", "Ly", "Lz", "Lnorm"]):
        line(ax, points(run, lambda row, k=key: row.get(k), "energy"), "|L|" if key=="Lnorm" else key, color, unit="1e10 Msun kpc^2/Myr")
    ax.set_ylabel("L [10¹⁰ M☉ kpc²/Myr]")
ax=axes[1, 0]; ax.set_title("Variação vetorial escalada · sistema isolado")
for color, run in enumerate([C, *BH, GPUDT[1]]):
    if run:
        label = "CPU direto f64" if run is C else ("GPU direto f32" if run is GPUDT[1] else "BH f64 · θ = "+str(run["config"]["theta"]))
        line(ax, points(run, lambda row: row.get("angularMomentumScaledError"), "energy"), label, color, unit="dimensionless")
ax.set_ylabel("|ΔL| / Σ m|r×v|₀")
ax=axes[1, 1]; ax.set_title("Halo fixo axisimétrico · conservação de Lz")
line(ax, points(B, lambda row: row.get("deltaLzRelative"), "energy"), "ΔLz / |Lz(0)|", 0, unit="dimensionless")
ax.set_ylabel("ΔLz / |Lz(0)|")
finish(fig, axes, "angular-momentum", "Evolução do momento angular", "Componentes Lx, Ly, Lz, módulo e erros medidos em sistemas isolado e com halo externo fixo.", "O vetor L completo é uma invariante do sistema isolado com forças internas centrais. Um campo externo estacionário axisimétrico garante Lz; não garante em geral Lx, Ly, o vetor completo ou o momento linear. A normalização vetorial usa a escala inicial Σ m|r×v|, evitando componentes iniciais quase nulas.", [C, B, *BH, GPUDT[1]])

# 10. Like-for-like short controls; long controls display their actual horizons.
fig, axes = begin("field-comparison", "Campo contínuo, halo fixo e halo dinâmico", "A muda a natureza do problema: partículas de teste em potencial estacionário; B e C mantêm autogravitação bariônica.", 2, 2)
for ax, pop, title in [(axes[0, 0], "thin", "Ensaio novo · disco fino · primeiros 20 Myr"), (axes[0, 1], "thick", "Ensaio novo · disco espesso · primeiros 20 Myr")]:
    ax.set_title(title)
    for color, (run, label) in enumerate([(A, "A · AGAMA contínuo"), (B, "B · halo fixo"), (C, "C · halo dinâmico")]):
        values=points(run, lambda row, p=pop: h50(row, p), max_time=20)
        baseline=values[0][1] if values else None
        if baseline:
            values=[(time, value/baseline) for time,value in values]
        line(ax, values, label, color, unit="h50/h50_initial")
    ax.set_ylabel("h₅₀(t) / h₅₀(0)")
ax=axes[1, 0]; ax.set_title("Controle contínuo real AGAMA · 1 Gyr")
for color, (run, label) in enumerate([(A_ORIGINAL, "AGAMA original · N = 1.000"), (A, "AGAMA calibrado · N = 1.000")]):
    values=points(run, lambda row: h50(row))
    baseline=values[0][1] if values else None
    line(ax, [(time,value/baseline) for time,value in values] if baseline else [], label, color, unit="h50/h50_initial")
ax.set_ylabel("h₅₀(t) / h₅₀(0)")
ax=axes[1, 1]; ax.set_title("Trajetórias históricas calibradas · h₅₀ global")
for color, (name, label) in enumerate([("calibrated-fixed", "B · halo fixo · bárions de N = 10.000"), ("calibrated-A-10k", "C · dinâmico · N = 10.000"), ("calibrated-A-50k", "C · dinâmico · N = 50.000")]):
    run=HISTORY.get(name); values=points(run, lambda row: h50(row)); baseline=values[0][1] if values else None
    line(ax, [(time,value/baseline) for time,value in values] if baseline else [], label, color, unit="h50/h50_initial")
ax.set_ylabel("h₅₀(t) / h₅₀(0)")
finish(fig, axes, "field-comparison", "Campo contínuo, halo fixo e halo dinâmico", "Comparação estrutural dos controles A, B e C, com identificação da campanha e do intervalo efetivamente calculado.", "O controle contínuo novo usa o AGAMA original sem suavização de Plummer e integração adaptativa DOP853; B/C usam o Hamiltoniano discreto suavizado e KDK. Sua comparação investiga a passagem contínuo–discreto, sem atribuir diferenças apenas ao integrador. Curvas não são extrapoladas após seu término.", [A, A_ORIGINAL, B, C, HISTORY.get("calibrated-fixed"), HISTORY.get("calibrated-A-10k"), HISTORY.get("calibrated-A-50k")])

manifest={"schema":"validation-101-figures-v1", "generatedUTC":datetime.now(timezone.utc).isoformat(),
          "script":"scripts/validation-101/plot.py", "scriptSHA256":hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
          "matplotlib":matplotlib.__version__, "velocityConversionKmSPerKpcMyr":KM_S, "energyConversionJPerInternal":ENERGY_J,
          "policy":"Measurements only. No invented points, fitted uncertainty, extrapolated orbit, or interpolation of sparse direct energy snapshots.",
          "figures":FIGURES, "sourceHashes":SOURCE_HASHES}
(OUT/"figure-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+"\n", encoding="utf8")
print("Manifest:", OUT/"figure-manifest.json", flush=True)
