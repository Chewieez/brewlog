import { jsx as _jsx } from "react/jsx-runtime";
export const Card = ({ children, variant = 'default', padding = 'md', onPress, testID, accessibilityLabel, }) => {
    const paddingClasses = {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
    }[padding];
    let variantClasses = 'bg-panel border border-border-subtle';
    if (variant === 'recessed') {
        variantClasses = 'bg-panel-recessed border border-border-subtle';
    }
    else if (variant === 'interactive') {
        variantClasses = 'bg-panel border border-border-subtle hover:border-border-active active:border-copper cursor-pointer transition-colors';
    }
    return (_jsx("div", { "data-testid": testID, "aria-label": accessibilityLabel, onClick: onPress, role: onPress ? 'button' : undefined, tabIndex: onPress ? 0 : undefined, onKeyDown: onPress ? (e) => { if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPress();
        } } : undefined, className: `rounded-xl ${paddingClasses} ${variantClasses}`, children: children }));
};
