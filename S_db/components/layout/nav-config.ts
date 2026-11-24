import type { IconType } from "react-icons";
import {
  HiOutlineClipboardDocumentList,
  HiOutlineCog6Tooth,
  HiOutlineCreditCard,
  HiOutlineHome,
  HiOutlineShoppingBag,
  HiOutlineSquares2X2,
} from "react-icons/hi2";

export interface NavItem {
  href: string;
  label: string;
  icon: IconType;
  count?: number;
  unread?: boolean;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: HiOutlineHome },
      { href: "/listings", label: "My Listings", icon: HiOutlineSquares2X2 },
      {
        href: "/requests",
        label: "Requests",
        icon: HiOutlineClipboardDocumentList,
      },
      {
        href: "/orders",
        label: "Orders",
        icon: HiOutlineShoppingBag,
      },
      {
        href: "/credit-wallet",
        label: "Credit Wallet",
        icon: HiOutlineCreditCard,
      },
    ],
  },
];

export const profileNav: NavItem = {
  href: "/account",
  label: "Business & Account",
  icon: HiOutlineCog6Tooth,
};

export const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/listings": "My Listings",
  "/requests": "Requests",
  "/orders": "Orders",
  "/credit-wallet": "Credit Wallet",
  "/account": "Business & Account",
  "/quotations": "My Quotations",
  "/fulfillment": "Fulfillment",
  "/inventory": "Inventory",
  "/category-requests": "Category requests",
  "/transactions": "Transactions",
  "/messages": "Messages",
  "/business-profile": "Business Profile",
};
