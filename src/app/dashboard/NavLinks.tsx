"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/staff", label: "Staff" },
  { href: "/dashboard/payroll", label: "Payroll" },
  { href: "/dashboard/exports", label: "Exports" },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="topbar-nav">
      {NAV_LINKS.map((link) => {
        // Exact match for dashboard root, prefix match for sub-pages
        const isActive =
          link.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`topbar-link${isActive ? " topbar-link--active" : ""}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}