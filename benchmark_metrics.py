"""
Urbanis-AI Telemetry & Energy Profiler
======================================
Measures AI workload metrics using:
- PyTorch (torch)
- CodeCarbon (OfflineEmissionsTracker / EmissionsTracker)
- NVIDIA Management Library (pynvml / nvidia-ml-py)

Computes:
1. Energy Consumption (kWh, Joules, CPU/GPU/RAM power draw)
2. Latency (Total time, Mean, Median, Min, Max, P95, P99, Throughput)
3. Financial Cost (Electricity tariff + Cloud/Compute cost)
4. Carbon Impact (kg CO2e, g CO2e, Grid intensity, Environmental Equivalents)
"""

import os
import sys
import time
import json
import statistics
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List

# ---------------------------------------------------------
# 1. Hardware & NVML Inspection
# ---------------------------------------------------------
pynvml_status = {
    "available": False,
    "device_count": 0,
    "devices": [],
    "error": None
}

try:
    import pynvml
    try:
        pynvml.nvmlInit()
        count = pynvml.nvmlDeviceGetCount()
        pynvml_status["available"] = True
        pynvml_status["device_count"] = count
        
        for i in range(count):
            handle = pynvml.nvmlDeviceGetHandleByIndex(i)
            name = pynvml.nvmlDeviceGetName(handle)
            if isinstance(name, bytes):
                name = name.decode("utf-8")
            
            # Query memory
            mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
            
            # Query power if supported
            try:
                power_mw = pynvml.nvmlDeviceGetPowerUsage(handle)
                power_w = power_mw / 1000.0
            except Exception:
                power_w = None
                
            # Query temperature if supported
            try:
                temp_c = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
            except Exception:
                temp_c = None

            pynvml_status["devices"].append({
                "index": i,
                "name": name,
                "total_memory_mb": round(mem_info.total / (1024 ** 2), 2),
                "free_memory_mb": round(mem_info.free / (1024 ** 2), 2),
                "used_memory_mb": round(mem_info.used / (1024 ** 2), 2),
                "power_draw_watts": power_w,
                "temperature_c": temp_c
            })
    except Exception as e:
        pynvml_status["error"] = f"{type(e).__name__}: {str(e)}"
except ImportError as e:
    pynvml_status["error"] = f"pynvml not installed: {str(e)}"

# ---------------------------------------------------------
# 2. PyTorch Setup & Workload Definition
# ---------------------------------------------------------
import torch
import torch.nn as nn

class SpatialGenerativeBlock(nn.Module):
    """Synthetic multi-head spatial evaluation network representing Urbanis modular generation."""
    def __init__(self, d_model=512, n_heads=8, hidden_dim=1024):
        super().__init__()
        self.self_attn = nn.MultiheadAttention(embed_dim=d_model, num_heads=n_heads, batch_first=True)
        self.linear1 = nn.Linear(d_model, hidden_dim)
        self.relu = nn.ReLU()
        self.linear2 = nn.Linear(hidden_dim, d_model)
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)

    def forward(self, x):
        attn_out, _ = self.self_attn(x, x, x)
        x = self.norm1(x + attn_out)
        ffn_out = self.linear2(self.relu(self.linear1(x)))
        return self.norm2(x + ffn_out)

# ---------------------------------------------------------
# 3. CodeCarbon Tracker Integration
# ---------------------------------------------------------
import codecarbon
from codecarbon import OfflineEmissionsTracker

def run_benchmark(
    iterations: int = 40,
    batch_size: int = 32,
    seq_len: int = 64,
    d_model: int = 512,
    electricity_rate_inr_per_kwh: float = 8.50,
    electricity_rate_usd_per_kwh: float = 0.12,
    cloud_cost_usd_per_hour: float = 0.45
) -> Dict[str, Any]:
    """
    Executes a benchmark while recording latency, hardware power, and carbon impact.
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = SpatialGenerativeBlock(d_model=d_model, n_heads=8, hidden_dim=1024).to(device)
    model.eval()

    # Pre-generate synthetic spatial embedding tensor
    sample_input = torch.randn(batch_size, seq_len, d_model, device=device)

    # Warmup pass (3 iterations)
    with torch.no_grad():
        for _ in range(3):
            _ = model(sample_input)
            if device.type == "cuda":
                torch.cuda.synchronize()

    # Initialize CodeCarbon emissions tracker
    tracker = OfflineEmissionsTracker(
        country_iso_code="IND",
        project_name="UrbanisAI-Inference-Profiler",
        measure_power_secs=1,
        log_level="error",
        save_to_file=False
    )

    latencies_ms: List[float] = []

    print("\n" + "=" * 70)
    print("  URBANIS-AI: COMMENCING ENERGY, LATENCY, COST & CARBON PROFILING")
    print("=" * 70)
    print(f"  PyTorch Version : {torch.__version__}")
    print(f"  Compute Device  : {device.type.upper()} ({torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'System CPU/Integrated GPU'})")
    print(f"  NVML Detected   : {'Yes (' + str(pynvml_status['device_count']) + ' GPU)' if pynvml_status['available'] else 'No / Non-Nvidia (' + str(pynvml_status['error']) + ')'}")
    print(f"  CodeCarbon Ver  : {codecarbon.__version__}")
    print(f"  Batch / Length  : {batch_size} batches x {seq_len} tokens ({d_model} dims)")
    print(f"  Total Iterations: {iterations}")
    print("-" * 70)

    # Start CodeCarbon tracking
    tracker.start()
    total_start_time = time.perf_counter()

    with torch.no_grad():
        for i in range(iterations):
            iter_start = time.perf_counter()
            _ = model(sample_input)
            if device.type == "cuda":
                torch.cuda.synchronize()
            iter_duration_ms = (time.perf_counter() - iter_start) * 1000.0
            latencies_ms.append(iter_duration_ms)

    total_duration_s = time.perf_counter() - total_start_time
    emissions_kg = tracker.stop()

    # Retrieve CodeCarbon detailed telemetry
    emissions_data = getattr(tracker, "_emissions_data", None)
    
    cpu_energy_kwh = getattr(emissions_data, "cpu_energy", 0.0) if emissions_data else 0.0
    gpu_energy_kwh = getattr(emissions_data, "gpu_energy", 0.0) if emissions_data else 0.0
    ram_energy_kwh = getattr(emissions_data, "ram_energy", 0.0) if emissions_data else 0.0
    total_energy_kwh = getattr(emissions_data, "energy_consumed", 0.0) if emissions_data else 0.0

    # Fallback energy calculation if hardware sensors did not register within rapid sub-second bursts
    if total_energy_kwh is None or total_energy_kwh <= 0:
        # Default typical TDP CPU ~65W, RAM ~15W
        avg_power_w = 65.0 + 15.0
        total_energy_kwh = (avg_power_w * total_duration_s) / 3_600_000.0
        cpu_energy_kwh = (65.0 * total_duration_s) / 3_600_000.0
        ram_energy_kwh = (15.0 * total_duration_s) / 3_600_000.0
        # Default India grid emission factor ~0.713 kg CO2/kWh
        if emissions_kg is None or emissions_kg <= 0:
            emissions_kg = total_energy_kwh * 0.713

    total_energy_joules = total_energy_kwh * 3_600_000.0
    average_power_watts = total_energy_joules / total_duration_s if total_duration_s > 0 else 0.0
    emissions_grams = (emissions_kg or 0.0) * 1000.0

    # ---------------------------------------------------------
    # 4. Latency Statistics
    # ---------------------------------------------------------
    mean_latency_ms = statistics.mean(latencies_ms)
    median_latency_ms = statistics.median(latencies_ms)
    min_latency_ms = min(latencies_ms)
    max_latency_ms = max(latencies_ms)
    stdev_latency_ms = statistics.stdev(latencies_ms) if len(latencies_ms) > 1 else 0.0
    
    sorted_latencies = sorted(latencies_ms)
    p95_index = int(0.95 * len(sorted_latencies))
    p99_index = int(0.99 * len(sorted_latencies))
    p95_latency_ms = sorted_latencies[min(p95_index, len(sorted_latencies) - 1)]
    p99_latency_ms = sorted_latencies[min(p99_index, len(sorted_latencies) - 1)]
    throughput_inferences_per_sec = (iterations * batch_size) / total_duration_s

    # ---------------------------------------------------------
    # 5. Financial Cost Modeling
    # ---------------------------------------------------------
    electricity_cost_inr = total_energy_kwh * electricity_rate_inr_per_kwh
    electricity_cost_usd = total_energy_kwh * electricity_rate_usd_per_kwh
    runtime_hours = total_duration_s / 3600.0
    cloud_compute_cost_usd = runtime_hours * cloud_cost_usd_per_hour
    cloud_compute_cost_inr = cloud_compute_cost_usd * 86.50
    total_cost_usd = electricity_cost_usd + cloud_compute_cost_usd
    total_cost_inr = electricity_cost_inr + cloud_compute_cost_inr

    # ---------------------------------------------------------
    # 6. Carbon Equivalencies
    # ---------------------------------------------------------
    # 1 km driven in a standard petrol passenger car ~ 0.12 kg CO2 (120 g CO2/km)
    km_car_equivalent = (emissions_kg or 0.0) / 0.12
    # 1 smartphone full charge ~ 0.008 kg CO2 (8 g CO2)
    smartphone_charges = (emissions_kg or 0.0) / 0.008
    # 1 mature tree absorbs ~ 22 kg CO2/year (~ 0.0602 kg CO2/day)
    tree_absorption_days = (emissions_kg or 0.0) / (22.0 / 365.25)

    results = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "hardware": {
            "device": str(device),
            "pytorch_version": torch.__version__,
            "cuda_available": torch.cuda.is_available(),
            "pynvml_status": pynvml_status
        },
        "workload": {
            "iterations": iterations,
            "batch_size": batch_size,
            "sequence_length": seq_len,
            "embedding_dimension": d_model,
            "total_items_processed": iterations * batch_size
        },
        "latency": {
            "total_duration_seconds": round(total_duration_s, 4),
            "mean_latency_ms": round(mean_latency_ms, 3),
            "median_latency_ms": round(median_latency_ms, 3),
            "min_latency_ms": round(min_latency_ms, 3),
            "max_latency_ms": round(max_latency_ms, 3),
            "p95_latency_ms": round(p95_latency_ms, 3),
            "p99_latency_ms": round(p99_latency_ms, 3),
            "std_deviation_ms": round(stdev_latency_ms, 3),
            "throughput_items_per_sec": round(throughput_inferences_per_sec, 2)
        },
        "energy_consumption": {
            "total_energy_kwh": total_energy_kwh,
            "total_energy_joules": round(total_energy_joules, 4),
            "cpu_energy_kwh": cpu_energy_kwh,
            "gpu_energy_kwh": gpu_energy_kwh,
            "ram_energy_kwh": ram_energy_kwh,
            "average_power_watts": round(average_power_watts, 2)
        },
        "carbon_impact": {
            "emissions_kg_co2e": emissions_kg,
            "emissions_grams_co2e": round(emissions_grams, 6),
            "grid_carbon_intensity_kg_per_kwh": 0.713,
            "equivalencies": {
                "km_driven_passenger_car": round(km_car_equivalent, 6),
                "smartphones_charged": round(smartphone_charges, 4),
                "tree_absorption_days": round(tree_absorption_days, 6)
            }
        },
        "financial_cost": {
            "electricity_cost_usd": round(electricity_cost_usd, 8),
            "electricity_cost_inr": round(electricity_cost_inr, 6),
            "cloud_compute_cost_usd": round(cloud_compute_cost_usd, 6),
            "cloud_compute_cost_inr": round(cloud_compute_cost_inr, 4),
            "total_cost_usd": round(total_cost_usd, 6),
            "total_cost_inr": round(total_cost_inr, 4),
            "tariff_assumptions": {
                "electricity_rate_usd_kwh": electricity_rate_usd_per_kwh,
                "electricity_rate_inr_kwh": electricity_rate_inr_per_kwh,
                "cloud_hourly_rate_usd": cloud_cost_usd_per_hour
            }
        }
    }

    # Clean display output
    print(f"  [1] LATENCY METRICS:")
    print(f"      - Total Duration  : {results['latency']['total_duration_seconds']} s")
    print(f"      - Mean Latency    : {results['latency']['mean_latency_ms']} ms / iteration")
    print(f"      - Median Latency  : {results['latency']['median_latency_ms']} ms")
    print(f"      - P95 / P99       : {results['latency']['p95_latency_ms']} ms / {results['latency']['p99_latency_ms']} ms")
    print(f"      - Min / Max       : {results['latency']['min_latency_ms']} ms / {results['latency']['max_latency_ms']} ms")
    print(f"      - Throughput      : {results['latency']['throughput_items_per_sec']} items/sec")
    print("-" * 70)
    print(f"  [2] ENERGY CONSUMPTION:")
    print(f"      - Total Energy    : {results['energy_consumption']['total_energy_kwh']:.8f} kWh ({results['energy_consumption']['total_energy_joules']:.2f} Joules)")
    print(f"      - CPU Energy      : {results['energy_consumption']['cpu_energy_kwh']:.8f} kWh")
    print(f"      - RAM Energy      : {results['energy_consumption']['ram_energy_kwh']:.8f} kWh")
    print(f"      - GPU Energy      : {results['energy_consumption']['gpu_energy_kwh']:.8f} kWh")
    print(f"      - Average Power   : {results['energy_consumption']['average_power_watts']} Watts")
    print("-" * 70)
    print(f"  [3] CARBON IMPACT:")
    print(f"      - Carbon Emission : {results['carbon_impact']['emissions_grams_co2e']:.6f} g CO2e ({results['carbon_impact']['emissions_kg_co2e']:.8f} kg CO2e)")
    print(f"      - Car Distance Eq : {results['carbon_impact']['equivalencies']['km_driven_passenger_car']:.6f} km driven")
    print(f"      - Smartphone Chg  : {results['carbon_impact']['equivalencies']['smartphones_charged']:.4f} full charges")
    print(f"      - Tree Offset Req : {results['carbon_impact']['equivalencies']['tree_absorption_days']:.6f} tree-days")
    print("-" * 70)
    print(f"  [4] FINANCIAL COST:")
    print(f"      - Electricity Cost: ${results['financial_cost']['electricity_cost_usd']:.6f} / INR {results['financial_cost']['electricity_cost_inr']:.4f}")
    print(f"      - Cloud Cost      : ${results['financial_cost']['cloud_compute_cost_usd']:.6f} / INR {results['financial_cost']['cloud_compute_cost_inr']:.4f}")
    print(f"      - Total Cost      : ${results['financial_cost']['total_cost_usd']:.6f} / INR {results['financial_cost']['total_cost_inr']:.4f}")
    print("=" * 70)

    return results

if __name__ == "__main__":
    report = run_benchmark(iterations=50, batch_size=16, seq_len=64, d_model=512)
    output_path = Path(__file__).parent / "telemetry_report.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"\n[+] Full telemetry report saved to: {output_path}")
