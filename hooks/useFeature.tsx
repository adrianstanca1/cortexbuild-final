import { useState, useEffect } from 'react';

interface UseFeatureResult {
    enabled: boolean;
    loading: boolean;
    error: string | null;
}

/**
 * Hook to check if a feature is enabled for the current tenant
 * Usage: const { enabled, loading } = useFeature('advanced_reports');
 */
export function useFeature(featureName: string): UseFeatureResult {
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const checkFeature = async () => {
            try {
                setLoading(true);
                setError(null);

                // Get current tenant context from localStorage or context
                const userStr = localStorage.getItem('user');
                if (!userStr) {
                    setEnabled(false);
                    setLoading(false);
                    return;
                }

                const user = JSON.parse(userStr);
                const companyId = user.companyId;

                if (!companyId) {
                    setEnabled(false);
                    setLoading(false);
                    return;
                }

                // Fetch feature status from API
                const response = await fetch(`/api/companies/${companyId}/features/${featureName}`, {
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    if (mounted) {
                        setEnabled(data.enabled || false);
                    }
                } else {
                    // Default to false if API call fails
                    if (mounted) {
                        setEnabled(false);
                    }
                }
            } catch (err: any) {
                if (mounted) {
                    setError(err.message);
                    setEnabled(false);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        checkFeature();

        return () => {
            mounted = false;
        };
    }, [featureName]);

    return { enabled, loading, error };
}

/**
 * Component wrapper that conditionally renders based on feature flag
 * Usage: <FeatureFlag feature="api_access">{children}</FeatureFlag>
 */
interface FeatureFlagProps {
    feature: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

export function FeatureFlag({ feature, children, fallback = null }: FeatureFlagProps) {
    const { enabled, loading } = useFeature(feature);

    if (loading) {
        return null; // or a loading spinner
    }

    if (!enabled) {
        return <>{ fallback } </>;
    }

    return <>{ children } </>;
}

/**
 * HOC to wrap components that require a feature
 */
export function withFeature<P extends object>(
    Component: React.ComponentType<P>,
    featureName: string,
    FallbackComponent?: React.ComponentType<P>
) {
    return function FeatureGatedComponent(props: P) {
        const { enabled, loading } = useFeature(featureName);

        if (loading) {
            return null;
        }

        if (!enabled) {
            if (FallbackComponent) {
                return <FallbackComponent { ...props } />;
            }
            return null;
        }

        return <Component { ...props } />;
    };
}
