import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Card } from './Card.web';
describe('Card (web)', () => {
    it('renders children with default panel styling and subtle border', () => {
        render(_jsx(Card, { children: _jsx("span", { children: "Panel Content" }) }));
        const card = screen.getByText('Panel Content').parentElement;
        expect(card).toBeInTheDocument();
        expect(card?.className).toContain('bg-panel');
        expect(card?.className).toContain('border-border-subtle');
    });
    it('renders recessed variant with panel-recessed class', () => {
        render(_jsx(Card, { variant: "recessed", children: _jsx("span", { children: "Recessed Content" }) }));
        const card = screen.getByText('Recessed Content').parentElement;
        expect(card?.className).toContain('bg-panel-recessed');
    });
    it('triggers onPress when clicked in interactive mode', () => {
        const handlePress = vi.fn();
        render(_jsx(Card, { variant: "interactive", onPress: handlePress, children: _jsx("span", { children: "Click Me" }) }));
        const card = screen.getByText('Click Me').parentElement;
        expect(card?.className).toContain('hover:border-border-active');
        expect(card?.className).toContain('active:border-copper');
        fireEvent.click(screen.getByText('Click Me'));
        expect(handlePress).toHaveBeenCalledTimes(1);
    });
});
