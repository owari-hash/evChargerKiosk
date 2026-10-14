'use client';

import { useCallback, useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui';
import { ConnectorList } from './connector-list';
import { ChargingFlow } from './charging-flow';
import type { StationAvailability, StationConnector } from '@/lib/types';
import type { Locale } from '@/lib/i18n/config';

interface LiveState {
  availability: StationAvailability;
  connectors: StationConnector[];
  availableConnectors: number;
  totalConnectors: number;
}

export interface StationLiveViewProps {
  stationId: string;
  initialConnectors: StationConnector[];
  availability: StationAvailability;
  tariffPerKwh?: number;
  signedIn: boolean;
  hasIdTag: boolean;
  remoteStartEnabled: boolean;
  /** Gun preselected by the QR sticker the driver scanned. */
  initialConnectorId?: number;
  locale?: Locale;
  connectorsTitle: string;
  detailsSlot?: React.ReactNode;
}

export function StationLiveView({
  stationId,
  initialConnectors,
  availability,
  tariffPerKwh,
  signedIn,
  hasIdTag,
  remoteStartEnabled,
  initialConnectorId,
  locale,
  connectorsTitle,
  detailsSlot,
}: StationLiveViewProps) {
  const [connectors, setConnectors] = useState<StationConnector[]>(initialConnectors);

  const handleLiveUpdate = useCallback((live: LiveState) => {
    if (live.connectors && live.connectors.length > 0) {
      setConnectors(live.connectors);
    }
  }, []);

  return (
    <div className="mt-6 space-y-6">
      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>{connectorsTitle}</CardTitle>
          </CardHeader>
          <CardBody>
            <ConnectorList
              connectors={connectors}
              locale={locale}
              scannedConnectorId={initialConnectorId}
            />
          </CardBody>
        </Card>

        {detailsSlot}
      </div>

      <ChargingFlow
        stationId={stationId}
        connectors={connectors}
        availability={availability}
        tariffPerKwh={tariffPerKwh}
        signedIn={signedIn}
        hasIdTag={hasIdTag}
        remoteStartEnabled={remoteStartEnabled}
        initialConnectorId={initialConnectorId}
        onLiveUpdate={handleLiveUpdate}
      />
    </div>
  );
}
