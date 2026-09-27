import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { CookieBanner } from '@/components/shared/cookie-banner';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

describe('CookieBanner', () => {
    beforeEach(() => {
        localStorageMock.clear();
        jest.clearAllTimers();
    });

    describe('Initial Render', () => {
        it('should display banner on first visit', () => {
            // GIVEN: User has not accepted cookies yet
            // WHEN: Component renders
            render(<CookieBanner />);

            // THEN: Banner should be visible with message
            expect(
                screen.getByText(/usamos cookies para analíticas/i)
            ).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /ok/i })).toBeInTheDocument();
        });

        it('should not display banner if cookies already accepted', () => {
            // GIVEN: User has already accepted cookies
            localStorageMock.setItem('cookiesAccepted', 'true');

            // WHEN: Component renders
            render(<CookieBanner />);

            // THEN: Banner should not be visible
            expect(
                screen.queryByText(/usamos cookies para analíticas/i)
            ).not.toBeInTheDocument();
        });
    });

    describe('User Interaction', () => {
        it('should hide banner when OK button is clicked', () => {
            // GIVEN: Banner is displayed
            render(<CookieBanner />);
            const okButton = screen.getByRole('button', { name: /ok/i });

            // WHEN: User clicks OK button
            fireEvent.click(okButton);

            // THEN: Banner should be hidden
            expect(
                screen.queryByText(/usamos cookies para analíticas/i)
            ).not.toBeInTheDocument();
        });

        it('should save acceptance to localStorage when OK is clicked', () => {
            // GIVEN: Banner is displayed
            render(<CookieBanner />);
            const okButton = screen.getByRole('button', { name: /ok/i });

            // WHEN: User clicks OK button
            fireEvent.click(okButton);

            // THEN: localStorage should be updated
            expect(localStorageMock.getItem('cookiesAccepted')).toBe('true');
        });
    });

    describe('Auto-dismiss', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should auto-dismiss after timeout', () => {
            // GIVEN: Banner is displayed
            render(<CookieBanner />);
            expect(
                screen.getByText(/usamos cookies para analíticas/i)
            ).toBeInTheDocument();

            // WHEN: Time passes (10 seconds)
            jest.advanceTimersByTime(10000);

            // THEN: Banner should be hidden
            waitFor(() => {
                expect(
                    screen.queryByText(/usamos cookies para analíticas/i)
                ).not.toBeInTheDocument();
            });
        });

        it('should save to localStorage on auto-dismiss', () => {
            // GIVEN: Banner is displayed
            render(<CookieBanner />);

            // WHEN: Time passes and banner auto-dismisses
            jest.advanceTimersByTime(10000);

            // THEN: localStorage should be updated
            waitFor(() => {
                expect(localStorageMock.getItem('cookiesAccepted')).toBe('true');
            });
        });
    });
});
