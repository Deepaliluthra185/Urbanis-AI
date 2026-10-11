import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, AlertTriangle, Package, Truck, MapPin, ExternalLink, Plus, ArrowRight, LayoutGrid, ShieldCheck, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";

export function AgentErrorModal({ isOpen, onClose, agentResult, agentName, catalog, projectId }) {
  const navigate = useNavigate();
  const gap = agentResult?.gap;
  const missingMaterials = getMissingMaterials(agentResult, catalog);
  const suppliers = getSuppliersForMaterials(missingMaterials, catalog);

  const goToDesign = () => {
    onClose();
    navigate(`/project/${projectId}/design`);
  };

  const goToSiteValidation = () => {
    onClose();
    navigate(`/project/${projectId}/site`);
  };

  const goToFormulation = () => {
    onClose();
    navigate(`/project/${projectId}/formulation`);
  };

  const getActionButtons = () => {
    const buttons = [];
    const reason = gap?.reason?.toLowerCase() || "";
    
    if (reason.includes("material") || reason.includes("module") || missingMaterials.length > 0) {
      buttons.push(
        <Button key="design" onClick={goToDesign} className="flex-1 sm:flex-initial">
          <Plus className="w-3.5 h-3.5 mr-2" />
          Add Materials/Modules
        </Button>
      );
    }
    
    if (reason.includes("site") || reason.includes("validation") || reason.includes("approved")) {
      buttons.push(
        <Button key="site" onClick={goToSiteValidation} variant="outline" className="flex-1 sm:flex-initial">
          <ShieldCheck className="w-3.5 h-3.5 mr-2" />
          Validate Site
        </Button>
      );
    }
    
    if (reason.includes("upstream") || reason.includes("incomplete")) {
      buttons.push(
        <Button key="formulation" onClick={goToFormulation} className="flex-1 sm:flex-initial">
          <Sparkles className="w-3.5 h-3.5 mr-2" />
          Run Upstream Agents
        </Button>
      );
    }

    // Default fallback
    if (buttons.length === 0) {
      buttons.push(
        <Button key="design" onClick={goToDesign} className="flex-1 sm:flex-initial">
          <Plus className="w-3.5 h-3.5 mr-2" />
          Go to Design
        </Button>,
        <Button key="formulation" onClick={goToFormulation} variant="outline" className="flex-1 sm:flex-initial">
          <Sparkles className="w-3.5 h-3.5 mr-2" />
          Back to Formulation
        </Button>
      );
    }

    return buttons;
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-[#0e0e11] border-zinc-800">
        <DialogHeader className="text-left">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 border border-amber-500/40 bg-amber-500/10 flex items-center justify-center rounded-none">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <DialogTitle className="text-lg font-display font-bold text-zinc-100">
                  {agentName.toUpperCase()} — Data Gap Flagged
                </DialogTitle>
                <DialogDescription className="text-zinc-400 mt-1">
                  This agent cannot proceed due to missing information.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {gap && (
          <div className="space-y-4 mb-4 border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-semibold">
              <AlertTriangle className="w-4 h-4" />
              RESPONSIBLE INSTITUTION
            </div>
            <p className="text-sm text-zinc-300">{gap.institution}</p>
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-semibold mt-3">
              <AlertTriangle className="w-4 h-4" />
              REASON
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{gap.reason}</p>
          </div>
        )}

        {missingMaterials.length > 0 && (
          <div className="space-y-4 mb-4">
            <div className="flex items-center gap-2 text-zinc-100 font-mono text-xs font-semibold">
              <Package className="w-4 h-4 text-green-400" />
              MISSING MATERIALS
            </div>
            <div className="space-y-2">
              {missingMaterials.map((mat) => (
                <div key={mat.id} className="border border-zinc-800 bg-[#18181b] p-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 border border-zinc-700 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-100 truncate">{mat.name}</p>
                      <p className="text-[10px] font-mono text-zinc-500">{mat.id}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-green-400 bg-green-400/10 px-2 py-1 border border-green-400/30">
                    REQUIRED
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {suppliers.length > 0 && (
          <div className="space-y-4 mb-4">
            <div className="flex items-center gap-2 text-zinc-100 font-mono text-xs font-semibold">
              <Truck className="w-4 h-4 text-blue-400" />
              AVAILABLE SUPPLIERS
            </div>
            <p className="text-sm text-zinc-400">
              Certified suppliers within 50km for the required materials:
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {suppliers.map((supplier) => (
                <div key={supplier.id} className="border border-zinc-800 bg-[#18181b] p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 border border-zinc-700 flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-zinc-100 truncate">{supplier.name}</p>
                        <span className="text-[9px] font-mono text-green-400 bg-green-400/10 px-1.5 py-0.5 border border-green-400/30">
                          {supplier.distance_km}km
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                        {supplier.location} · {supplier.delivery.split("—")[0]}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {supplier.materials.map((m) => (
                          <span
                            key={m}
                            className="text-[9px] font-mono text-blue-400 bg-blue-400/10 px-1.5 py-0.5 border border-blue-400/30"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {missingMaterials.length === 0 && suppliers.length === 0 && !gap && (
          <div className="text-center py-8 text-zinc-500">
            <AlertTriangle className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
            <p className="text-sm">No specific missing materials identified for this agent.</p>
            <p className="text-xs text-zinc-600 mt-1">Check the agent output for more details.</p>
          </div>
        )}

        <DialogFooter className="border-t border-zinc-800 pt-4 mt-4 flex-wrap gap-2">
          {getActionButtons()}
          <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">
            <X className="w-3.5 h-3.5 mr-2" />
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getMissingMaterials(agentResult, catalog) {
  const materials = catalog?.materials || [];
  const missing = [];

  if (agentResult?.gap?.reason?.toLowerCase().includes("material")) {
    materials.forEach((mat) => {
      missing.push(mat);
    });
  }

  if (agentResult?.suppliers) {
    const supplierMaterials = new Set();
    agentResult.suppliers.forEach((s) => {
      s.materials.forEach((m) => supplierMaterials.add(m));
    });
    materials.forEach((mat) => {
      if (!supplierMaterials.has(mat.id)) {
        missing.push(mat);
      }
    });
  }

  return missing.slice(0, 10);
}

function getSuppliersForMaterials(missingMaterials, catalog) {
  const suppliers = catalog?.suppliers || [];
  if (!suppliers.length || !missingMaterials.length) return [];

  const missingIds = new Set(missingMaterials.map((m) => m.id));
  return suppliers
    .filter((s) => s.materials.some((m) => missingIds.has(m)))
    .slice(0, 10);
}