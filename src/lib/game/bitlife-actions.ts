import { BriefcaseBusiness, CircleDollarSign, HeartHandshake, Moon, RadioTower, ShieldAlert, Stethoscope, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type BitlifeAction = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const bitlifeActions: BitlifeAction[] = [
  {
    id: "work",
    label: "Work",
    description: "Take the practical job move.",
    icon: BriefcaseBusiness
  },
  {
    id: "family",
    label: "Family",
    description: "Spend scarce attention on people.",
    icon: HeartHandshake
  },
  {
    id: "verify",
    label: "Verify",
    description: "Check whether the story is real.",
    icon: ShieldAlert
  },
  {
    id: "money",
    label: "Money",
    description: "Protect rent, savings, and access.",
    icon: CircleDollarSign
  },
  {
    id: "health",
    label: "Health",
    description: "Rest before stress makes choices for you.",
    icon: Stethoscope
  },
  {
    id: "community",
    label: "People",
    description: "Coordinate with trusted humans.",
    icon: Users
  },
  {
    id: "resist",
    label: "Resist",
    description: "Refuse a system that wants quiet compliance.",
    icon: RadioTower
  },
  {
    id: "rest",
    label: "Rest",
    description: "Let the day pass without optimizing it.",
    icon: Moon
  }
];
