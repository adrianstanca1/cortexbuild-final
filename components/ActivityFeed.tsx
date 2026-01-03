import React from 'react';
import { ActivityFeed as NewActivityFeed } from './collaboration/ActivityFeed';

interface ActivityFeedProps {
    projectId?: string;
    entityType?: string;
    entityId?: string;
    limit?: number;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = (props) => {
    return <NewActivityFeed {...props} />;
};
