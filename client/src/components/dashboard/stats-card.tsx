import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number;
  subtitle: string;
  trend: string;
  icon: LucideIcon;
  color: "indigo" | "emerald" | "amber" | "rose";
}

const colorClasses = {
  indigo: {
    iconBg: "bg-indigo-100 dark:bg-indigo-900",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    trendColor: "text-emerald-600 dark:text-emerald-400",
  },
  emerald: {
    iconBg: "bg-emerald-100 dark:bg-emerald-900",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    trendColor: "text-primary",
  },
  amber: {
    iconBg: "bg-amber-100 dark:bg-amber-900",
    iconColor: "text-amber-600 dark:text-amber-400",
    trendColor: "text-rose-600 dark:text-rose-400",
  },
  rose: {
    iconBg: "bg-rose-100 dark:bg-rose-900",
    iconColor: "text-rose-600 dark:text-rose-400",
    trendColor: "text-rose-600 dark:text-rose-400",
  },
};

export default function StatsCard({ title, value, subtitle, trend, icon: Icon, color }: StatsCardProps) {
  const colors = colorClasses[color];

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 ${colors.iconBg} rounded-xl flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${colors.iconColor}`} />
          </div>
          <Badge variant="secondary" className={`text-sm font-medium ${colors.trendColor}`}>
            {trend}
          </Badge>
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-1">
          {value.toLocaleString()}
        </h3>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
