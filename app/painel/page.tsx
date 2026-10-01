import type { Metadata } from "next";
import Dashboard from "./dashboard";

export const dynamic = "force-static";
export const metadata: Metadata = { title: "Painel | USE MAVIÊ", robots: { index: false } };

export default function Painel() {
  return <Dashboard />;
}
