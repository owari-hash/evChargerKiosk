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
  locale?: Locale;
  connectorsTitle: string;
  mapSlot?: React.ReactNode;
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
  locale,
  connectorsTitle,
  mapSlot,
  detailsSlot,
}: StationLiveViewProps) {
  const [connectors, setConnectors] = useState<StationConnector[]>(initialConnectors);

  const handleLiveUpdate = useCallback((live: LiveState) => {
    if (live.connectors && live.connectors.length > 0) {
      setConnectors(live.connectors);
    }
  }, []);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>{connectorsTitle}</CardTitle>
          </CardHeader>
          <CardBody>
            <ConnectorList connectors={connectors} locale={locale} />
          </CardBody>
        </Card>

        {mapSlot}
      </div>

      <div className="space-y-6">
        {detailsSlot}

        <ChargingFlow
          stationId={stationId}
          connectors={connectors}
          availability={availability}
          tariffPerKwh={tariffPerKwh}
          signedIn={signedIn}
          hasIdTag={hasIdTag}
          remoteStartEnabled={remoteStartEnabled}
          onLiveUpdate={handleLiveUpdate}
        />
      </div>
    </div>
  );
}
