export const getConnectionBoxId = (connection) =>
    connection?.original_name
    || connection?.box_name
    || connection?.name
    || connection?.address
    || '';

export const getConnectionDisplayName = (connection, fallback = '') =>
    connection?.name
    || connection?.display_name
    || connection?.original_name
    || connection?.box_name
    || connection?.address
    || fallback;

export const buildConnectionBoxMap = (connections = []) =>
    new Map(
        connections
            .map((connection) => {
                const boxId = getConnectionBoxId(connection);
                if (!boxId) {
                    return null;
                }

                return [
                    boxId,
                    {
                        boxId,
                        displayName: getConnectionDisplayName(connection, boxId),
                        connection,
                    },
                ];
            })
            .filter(Boolean)
    );
