import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number;
  subtitle: string;
  trend: string;
  icon: LucideIcon;
  color: "orange" | "emerald" | "amber" | "rose";
}

const colorClasses = {
  orange: {
    iconBg: "bg-accent",
    iconColor: "text-primary",
    trendColor: "text-emerald-600",
  },
  emerald: {
    iconBg: "bg-secondary",
    iconColor: "text-emerald-600",
    trendColor: "text-primary",
  },
  amber: {
    iconBg: "bg-secondary",
    iconColor: "text-amber-600",
    trendColor: "text-primary",
  },
  rose: {
    iconBg: "bg-secondary",
    iconColor: "text-rose-600",
    trendColor: "text-primary",
  },
};

export default function StatsCard({ title, value, subtitle, trend, icon: Icon, color }: StatsCardProps) {
  const colors = colorClasses[color];

  return (
    <Card className="warm-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 ${colors.iconBg} rounded-xl flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${colors.iconColor}`} />
          </div>
          <Badge variant="secondary" className={`text-sm font-medium ${colors.trendColor}`}>
            {trend}
          </Badge>
        </div>
        <h3 className="text-2xl font-bold text-primary mb-1">
          {value.toLocaleString()}
        </h3>
        <p className="text-sm text-secondary">{title}</p>
        <p className="text-xs text-muted mt-2">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
