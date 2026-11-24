"use client";

import { useCallback, useEffect, useState } from "react";
import { HiCheckBadge, HiMapPin, HiUsers } from "react-icons/hi2";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Panel, PanelHead } from "@/components/shared/panel";
import { PageSkeleton } from "@/components/shared/skeletons";
import { StatusBadge } from "@/components/shared/status-badge";
import { getBusinessProfile } from "@/lib/services/profile";
import { errorMessage } from "@/lib/services/auth";
import type { BusinessProfile } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";

const value = (input: string | null | undefined) => input || "Not provided";

export default function BusinessProfilePage({ embedded = false }: { embedded?: boolean }) {
  const { membership } = useAuth();
  const businessId = membership?.business.id;
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      setProfile(await getBusinessProfile(businessId));
    } catch (error) {
      toast.error(errorMessage(error));
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [businessId]);
  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <PageSkeleton />;
  if (!profile)
    return (
      <Panel className="p-8 text-center text-sm text-muted-text">
        Business profile could not be loaded from PartsArc.
      </Panel>
    );

  return (
    <div>
      {!embedded ? <PageHeader
        eyebrow="ACCOUNT"
        title="Business profile"
        description="Verified business, membership and location data from PartsArc. Contact operations to request changes to admin-managed fields."
      /> : null}
      <div className="grid gap-[18px] xl:grid-cols-2">
        <Panel>
          <PanelHead
            title="Supplier information"
            action={
              profile.verifiedAt ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success">
                  <HiCheckBadge /> Verified
                </span>
              ) : (
                <StatusBadge status={profile.status} />
              )
            }
          />
          <dl className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            {[
              ["Display name", profile.displayName],
              ["Legal name", profile.legalName],
              ["Business code", profile.businessCode],
              ["Email", profile.email],
              ["Phone", profile.phone],
              ["Trade licence", profile.tradeLicense],
              ["VAT / BIN", profile.vatNumber],
              ["Status", profile.status],
            ].map(([label, content]) => (
              <div key={label}>
                <dt className="text-[10px] font-bold uppercase tracking-wide text-muted-text">
                  {label}
                </dt>
                <dd className="mt-1 text-sm font-semibold text-ink">
                  {value(content)}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel>
          <PanelHead title="Supported categories" />
          <div className="flex flex-wrap gap-2 p-5">
            {profile.supportedCategories.length ? (
              profile.supportedCategories.map((category) => (
                <span
                  key={category}
                  className="rounded-lg border border-blue bg-blue-2 px-3 py-2 text-xs font-bold text-blue"
                >
                  {category}
                </span>
              ))
            ) : (
              <p className="text-sm text-muted-text">
                No supported categories are configured.
              </p>
            )}
          </div>
          <div className="border-t border-line p-5">
            <h3 className="text-xs font-bold text-ink">Service areas</h3>
            <p className="mt-2 text-sm text-muted-text">
              {profile.serviceAreas.length
                ? profile.serviceAreas.join(" · ")
                : "No service areas are configured."}
            </p>
          </div>
        </Panel>
        <Panel>
          <PanelHead title="Locations" />{" "}
          <div className="space-y-3 p-5">
            {profile.locations.filter((location) => location.isActive)
              .length ? (
              profile.locations
                .filter((location) => location.isActive)
                .map((location) => (
                  <div
                    key={location.id}
                    className="rounded-xl border border-line p-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <strong className="inline-flex items-center gap-2 text-sm">
                        <HiMapPin className="text-blue" />
                        {location.label}
                      </strong>
                      {location.isPrimary ? (
                        <StatusBadge status="Primary" />
                      ) : null}
                    </div>
                    <p className="text-sm text-ink">{location.addressLine}</p>
                    <p className="mt-1 text-xs text-muted-text">
                      {[location.area, location.city, location.postalCode]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                ))
            ) : (
              <p className="text-sm text-muted-text">
                No active locations are configured.
              </p>
            )}
          </div>
        </Panel>
        <Panel>
          <PanelHead
            title="Members"
            action={<HiUsers className="text-blue" />}
          />
          <div className="divide-y divide-line p-5">
            {profile.members.map((member) => (
              <div
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                key={member.id}
              >
                <div>
                  <b className="text-sm">{value(member.user.fullName)}</b>
                  <p className="text-xs text-muted-text">
                    {member.user.email} ·{" "}
                    {member.title ??
                      (member.isPrimary ? "Primary owner" : "Member")}
                  </p>
                </div>
                <StatusBadge
                  status={
                    member.isActive ? member.user.accountStatus : "INACTIVE"
                  }
                />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
