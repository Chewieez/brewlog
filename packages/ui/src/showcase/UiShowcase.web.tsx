import React, { useState } from 'react';
import { Button } from '../button/Button.web';
import { Card } from '../card/Card.web';
import { Badge } from '../badge/Badge.web';
import { Input } from '../input/Input.web';
import { MetricTile } from '../metric-tile/MetricTile.web';
import type { UiShowcaseProps } from './UiShowcase.types';

export const UiShowcase: React.FC<UiShowcaseProps> = ({ testID }) => {
  const [dose, setDose] = useState('18.5');

  return (
    <div data-testid={testID} className="p-6 space-y-8 bg-canvas text-text-primary max-w-2xl mx-auto">
      <section className="space-y-3">
        <h2 className="text-xs font-mono uppercase text-text-muted tracking-wider">SHOWCASE: BUTTONS</h2>
        <div className="flex flex-wrap gap-3">
          <Button label="START BREW" variant="primary" />
          <Button label="SETTINGS" variant="secondary" />
          <Button label="CANCEL" variant="ghost" />
          <Button label="DELETE BAG" variant="danger" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-mono uppercase text-text-muted tracking-wider">SHOWCASE: METRIC TILES</h2>
        <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-panel border border-border-subtle">
          <MetricTile label="COFFEE DOSE" value="15.0" unit="g" />
          <MetricTile label="WATER TARGET" value="250" unit="g" />
          <MetricTile label="POUR TO" value="100" unit="g" variant="accent" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-mono uppercase text-text-muted tracking-wider">SHOWCASE: BADGES</h2>
        <div className="flex flex-wrap gap-2">
          <Badge label="V60" variant="mono" />
          <Badge label="AEROPRESS" variant="mono" />
          <Badge label="NATURAL PROCESS" variant="default" />
          <Badge label="PEAK FRESHNESS" variant="success" />
          <Badge label="NEEDS REST" variant="warning" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-mono uppercase text-text-muted tracking-wider">SHOWCASE: INPUTS</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input label="COFFEE DOSE" variant="numeric" value={dose} onChangeText={setDose} unit="g" />
          <Input label="RECIPE TITLE" variant="default" value="Morning Kalita" onChangeText={() => {}} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-mono uppercase text-text-muted tracking-wider">SHOWCASE: CARDS</h2>
        <div className="grid grid-cols-2 gap-4">
          <Card variant="default"><p className="text-sm">Standard Chassis Card</p></Card>
          <Card variant="recessed"><p className="text-sm text-text-secondary">Recessed Panel Card</p></Card>
        </div>
      </section>
    </div>
  );
};
