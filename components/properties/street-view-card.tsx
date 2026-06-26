import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EditCameraDialog } from "./edit-camera-dialog";
import { buildStaticMapUrl, parseCameraPosition } from "@/lib/property-finance";

/**
 * Map / street-view banner. Renders a real static map only when a maps key is
 * configured (NEXT_PUBLIC_MAPS_KEY); otherwise a styled placeholder. The camera
 * position is editable + persisted either way.
 */
export function StreetViewCard({
  address,
  cameraPosition,
  propertyId,
  canManage,
}: {
  address: string;
  cameraPosition: unknown;
  propertyId: string;
  canManage: boolean;
}) {
  const position = parseCameraPosition(cameraPosition);
  const mapUrl = buildStaticMapUrl(position, process.env.NEXT_PUBLIC_MAPS_KEY);

  return (
    <Card className="relative overflow-hidden p-0">
      <div className="relative h-56 w-full">
        {mapUrl ? (
          // Dynamic provider URL — can't go through next/image without remote config.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mapUrl}
            alt={`Map of ${address}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-muted to-accent/10">
            <MapPin className="h-10 w-10 text-primary/40" />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <p className="flex items-center gap-1.5 text-sm font-medium text-white">
            <MapPin className="h-4 w-4" /> {address}
          </p>
          {position ? (
            <p className="mt-0.5 text-xs tabular-nums text-white/70">
              {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
            </p>
          ) : null}
        </div>

        {canManage ? (
          <div className="absolute right-3 top-3">
            <EditCameraDialog propertyId={propertyId} position={position} />
          </div>
        ) : null}
      </div>
    </Card>
  );
}
