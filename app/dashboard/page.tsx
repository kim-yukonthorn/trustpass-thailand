"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, AlertTriangle, MapPin, Activity, ShieldAlert } from "lucide-react";
import { SiteNav } from "@/components/SiteNav";
import { ThailandHeatmap } from "@/components/ThailandHeatmap";
import { useLanguage } from "@/lib/language-context";
import { translations } from "@/lib/translations";

type IntelligenceReport = {
  id: string;
  timestamp: string;
  city: string;
  category: string;
  risk_level: string;
  risk_score: number;
  signal_count: number;
};

type RiskCounts = {
  Low: number;
  Caution: number;
  High: number;
  Emergency: number;
};

type CityStats = {
  total: number;
  emergency: number;
  topCategory: string;
  maxRiskLevel: string;
  mapRiskLevel?: string;
  averageRiskScore?: number;
  riskCounts?: Partial<RiskCounts>;
  categoryCounts?: Record<string, number>;
};

type IntelligenceData = {
  kpis: {
    totalChecks7d: number;
    emergencyCount7d: number;
    topCategory: string;
    mostAffectedCity: string;
    sessionChecks?: number;
  };
  cityStats: Record<string, CityStats>;
  recentReports: IntelligenceReport[];
};

const SESSION_CASES_KEY = "trustpass-session-cases";

export default function DashboardPage() {
  const { lang } = useLanguage();
  const t = translations[lang];
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await fetch("/api/intelligence");
      if (!res.ok) throw new Error("Failed to fetch");
      const jsonData = await res.json() as IntelligenceData;
      setData(mergeSessionData(jsonData, readSessionReports()));
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return t.timeAgoMins(diffMins);
    if (diffHours < 24) return t.timeAgoHours(diffHours);
    return t.timeAgoDays(diffDays);
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "low": return "bg-green-100 text-green-800 border-green-200";
      case "caution": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "emergency": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <SiteNav />
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-5">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-azure hover:text-fluent-blueDark">
            <ArrowLeft className="h-4 w-4" />
            {t.backToOverview}
          </Link>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            {t.dashboardUpdated} {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <header className="rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm mb-6">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-azure">
            <Activity className="h-4 w-4" />
            {t.dashboardKicker}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-ink">{t.dashboardH1}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {t.dashboardDesc}
          </p>
        </header>

        {isLoading && !data ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-azure"></div>
          </div>
        ) : data ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-500">{t.dashboardTrackedCases}</h3>
                  <BarChart3 className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-2 text-3xl font-bold text-slate-900">{data.kpis.totalChecks7d}</p>
              </div>
              <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-500">{t.dashboardEmergencyCases}</h3>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
                <p className="mt-2 text-3xl font-bold text-red-600">{data.kpis.emergencyCount7d}</p>
              </div>
              <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-500">{t.dashboardTopCategory}</h3>
                  <ShieldAlert className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-2 text-xl font-bold text-slate-900 truncate" title={data.kpis.topCategory}>
                  {t.dashboardCategoryLabels[data.kpis.topCategory] ?? data.kpis.topCategory.replace(/_/g, ' ')}
                </p>
              </div>
              <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-500">{t.dashboardMostAffectedCity}</h3>
                  <MapPin className="h-4 w-4 text-slate-400" />
                </div>
                <p className="mt-2 text-xl font-bold text-slate-900">{data.kpis.mostAffectedCity}</p>
              </div>
            </div>

            <div className="mb-6 rounded-[8px] border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <span className="font-bold">{data.kpis.sessionChecks || 0} {t.dashboardSessionChecksLabel}</span>
              <span className="ml-2 text-blue-700">
                {t.dashboardSessionIncluded}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Heatmap */}
              <div className="lg:col-span-1 bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm flex flex-col items-center">
                <h2 className="text-lg font-bold text-ink w-full mb-4">{t.dashboardRiskHeatmap}</h2>
                <div className="w-full max-w-sm">
                  <ThailandHeatmap cityStats={data.cityStats} />
                </div>
              </div>

              {/* Recent Reports */}
              <div className="lg:col-span-2 bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-ink">{t.dashboardRecentReports}</h2>
                  <span className="text-xs text-slate-500">{t.dashboardShowingLast10}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t.dashboardColTime}</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t.dashboardColCity}</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t.dashboardColCategory}</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{t.dashboardColRiskLevel}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {data.recentReports.map((report) => (
                        <tr key={report.id} className="dashboard-report-row transition-colors hover:bg-slate-50 dark:hover:bg-[#1F2937]">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                            {formatTimeAgo(report.timestamp)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                            {report.city}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                            {t.dashboardCategoryLabels[report.category] ?? report.category.replace(/_/g, ' ')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRiskBadgeColor(report.risk_level)}`}>
                              {t.riskLevels[report.risk_level] ?? report.risk_level}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}

function readSessionReports(): IntelligenceReport[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.sessionStorage.getItem(SESSION_CASES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((report): report is IntelligenceReport => (
      typeof report?.id === "string" &&
      typeof report.timestamp === "string" &&
      typeof report.city === "string" &&
      typeof report.category === "string" &&
      typeof report.risk_level === "string" &&
      report.risk_level.toLowerCase() !== "low" &&
      typeof report.risk_score === "number" &&
      typeof report.signal_count === "number"
    ));
  } catch {
    return [];
  }
}

function mergeSessionData(seedData: IntelligenceData, sessionReports: IntelligenceReport[]): IntelligenceData {
  const eligibleSessionReports = sessionReports.filter((report) => report.risk_level.toLowerCase() !== "low");

  if (eligibleSessionReports.length === 0) {
    return {
      ...seedData,
      kpis: {
        ...seedData.kpis,
        sessionChecks: 0
      }
    };
  }

  const recentSessionReports = eligibleSessionReports.filter(isWithin7Days);
  const cityStats = mergeCityStats(seedData.cityStats, eligibleSessionReports);

  return {
    kpis: {
      totalChecks7d: seedData.kpis.totalChecks7d + recentSessionReports.length,
      emergencyCount7d: seedData.kpis.emergencyCount7d + recentSessionReports.filter((report) => report.risk_level.toLowerCase() === "emergency").length,
      topCategory: topCategoryWithSession(seedData.kpis.topCategory, recentSessionReports),
      mostAffectedCity: topCityFromStats(cityStats),
      sessionChecks: eligibleSessionReports.length
    },
    cityStats,
    recentReports: [...eligibleSessionReports, ...seedData.recentReports.filter((report) => report.risk_level.toLowerCase() !== "low")]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)
  };
}

function countBy(reports: IntelligenceReport[], getKey: (report: IntelligenceReport) => string) {
  return reports.reduce<Record<string, number>>((counts, report) => {
    const key = getKey(report);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function topKey(counts: Record<string, number>) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
}

function topCategoryWithSession(seedTopCategory: string, sessionReports: IntelligenceReport[]) {
  const sessionTop = topKey(countBy(sessionReports, (report) => report.category));
  return sessionTop === "N/A" ? seedTopCategory : sessionTop;
}

function topCityFromStats(cityStats: IntelligenceData["cityStats"]) {
  return Object.entries(cityStats).sort((a, b) => b[1].total - a[1].total)[0]?.[0] || "N/A";
}

function mergeCityStats(seedStats: IntelligenceData["cityStats"], sessionReports: IntelligenceReport[]): IntelligenceData["cityStats"] {
  const merged: IntelligenceData["cityStats"] = Object.fromEntries(
    Object.entries(seedStats).map(([city, stats]) => [city, normalizeCityStats(stats)])
  );
  const sessionByCity = sessionReports.reduce<Record<string, IntelligenceReport[]>>((groups, report) => {
    groups[report.city] ??= [];
    groups[report.city].push(report);
    return groups;
  }, {});

  for (const [city, reports] of Object.entries(sessionByCity)) {
    const current = merged[city] || normalizeCityStats({ total: 0, emergency: 0, topCategory: "N/A", maxRiskLevel: "Low" });
    const sessionMaxScore = Math.max(...reports.map((report) => report.risk_score));
    const total = current.total + reports.length;
    const riskCounts = { ...normalizeRiskCounts(current.riskCounts, current.emergency) };
    const categoryCounts = { ...(current.categoryCounts || {}) };
    let riskScoreTotal = (current.averageRiskScore || riskScoreFromLevel(current.mapRiskLevel || current.maxRiskLevel)) * current.total;

    for (const report of reports) {
      riskCounts[riskBucket(report.risk_level)] += 1;
      categoryCounts[report.category] = (categoryCounts[report.category] || 0) + 1;
      riskScoreTotal += report.risk_score;
    }

    const averageRiskScore = total > 0 ? riskScoreTotal / total : 0;

    merged[city] = {
      total,
      emergency: riskCounts.Emergency,
      topCategory: topKey(categoryCounts),
      maxRiskLevel: higherRiskLevel(current.maxRiskLevel, riskLevelFromScore(sessionMaxScore)),
      mapRiskLevel: dominantRiskLevel(riskCounts),
      averageRiskScore,
      riskCounts,
      categoryCounts
    };
  }

  return merged;
}

function normalizeCityStats(stats: CityStats): CityStats {
  const riskCounts = normalizeRiskCounts(stats.riskCounts, stats.emergency);
  const categoryCounts = stats.categoryCounts || (stats.topCategory !== "N/A" ? { [stats.topCategory]: stats.total } : {});
  const averageRiskScore = stats.averageRiskScore ?? riskScoreFromCounts(riskCounts, stats.total, stats.maxRiskLevel);

  return {
    ...stats,
    riskCounts,
    categoryCounts,
    averageRiskScore,
    mapRiskLevel: stats.mapRiskLevel || dominantRiskLevel(riskCounts)
  };
}

function normalizeRiskCounts(counts?: Partial<RiskCounts>, emergency = 0): RiskCounts {
  return {
    Low: counts?.Low || 0,
    Caution: counts?.Caution || 0,
    High: counts?.High || 0,
    Emergency: counts?.Emergency ?? emergency
  };
}

function riskBucket(level: string): keyof RiskCounts {
  switch (level.toLowerCase()) {
    case "emergency": return "Emergency";
    case "high": return "High";
    case "caution": return "Caution";
    default: return "Low";
  }
}

function riskScoreFromCounts(counts: RiskCounts, total: number, fallbackLevel: string) {
  if (total <= 0) return riskScoreFromLevel(fallbackLevel);
  return (
    counts.Low * riskScoreFromLevel("Low") +
    counts.Caution * riskScoreFromLevel("Caution") +
    counts.High * riskScoreFromLevel("High") +
    counts.Emergency * riskScoreFromLevel("Emergency")
  ) / total;
}

function dominantRiskLevel(counts: RiskCounts) {
  const order: Array<keyof RiskCounts> = ["Emergency", "High", "Caution", "Low"];
  return order.sort((a, b) => counts[b] - counts[a])[0];
}

function isWithin7Days(report: IntelligenceReport) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return new Date(report.timestamp) >= sevenDaysAgo;
}

function higherRiskLevel(a: string, b: string) {
  return riskScoreFromLevel(a) >= riskScoreFromLevel(b) ? a : b;
}

function riskLevelFromScore(score: number) {
  if (score >= 90) return "Emergency";
  if (score >= 70) return "High";
  if (score >= 45) return "Caution";
  return "Low";
}

function riskScoreFromLevel(level: string) {
  if (level.toLowerCase() === "emergency") return 90;
  if (level.toLowerCase() === "high") return 70;
  if (level.toLowerCase() === "caution") return 45;
  return 20;
}
