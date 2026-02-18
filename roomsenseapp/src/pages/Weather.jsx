import React, { useEffect, useState } from 'react';
import { CloudSun, Wind, Droplets, Thermometer, MapPin, RefreshCw, Loader2 } from 'lucide-react';
import { useWeather } from '../contexts/WeatherContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { IndoorOutdoorChart } from '../components/ui/IndoorOutdoorChart';
import NumberFlow from '@number-flow/react';

const Weather = () => {
    const { currentWeather, location, loading, error, refresh, getHistory } = useWeather();
    const [historicalData, setHistoricalData] = useState([]);
    const [chartLoading, setChartLoading] = useState(false);

    useEffect(() => {
        const fetchHistory = async () => {
            setChartLoading(true);
            try {
                // Get last 30 days to support chart ranges
                const end = new Date();
                const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
                const formatDate = (d) => d.toISOString().split('T')[0];

                const data = await getHistory(formatDate(start), formatDate(end));
                setHistoricalData(data);
            } catch (err) {
                console.error("Failed to load historical weather", err);
            } finally {
                setChartLoading(false);
            }
        };
        fetchHistory();
    }, [getHistory]);

    if (error) {
        return (
            <div className="p-6">
                <Card className="border-destructive/50 bg-destructive/10">
                    <CardContent className="pt-6 text-center text-destructive">
                        <p>{error}</p>
                        <Button variant="outline" onClick={refresh} className="mt-4">Try Again</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const current = currentWeather?.current;

    // State for chart ranges
    const [tempRange, setTempRange] = useState('24h');
    const [humidityRange, setHumidityRange] = useState('24h');

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Weather</h1>
                    <div className="flex items-center text-muted-foreground mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span>{location.name}</span>
                        <span className="mx-2">•</span>
                        <span>{location.latitude.toFixed(2)}°N, {location.longitude.toFixed(2)}°E</span>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Current Conditions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Temperature</CardTitle>
                        <Thermometer className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {current ? <NumberFlow value={current.temperature_2m} suffix={current.temperature_2m_unit || '°C'} /> : '--'}
                        </div>
                        <p className="text-xs text-muted-foreground">Current air temperature</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Humidity</CardTitle>
                        <Droplets className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {current ? <NumberFlow value={current.relative_humidity_2m} suffix={current.relative_humidity_2m_unit || '%'} /> : '--'}
                        </div>
                        <p className="text-xs text-muted-foreground">Relative humidity</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Wind Speed</CardTitle>
                        <Wind className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {current ? <NumberFlow value={current.wind_speed_10m} suffix={current.wind_speed_10m_unit || ' km/h'} /> : '--'}
                        </div>
                        <p className="text-xs text-muted-foreground">At 10m above ground</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Precipitation</CardTitle>
                        <CloudSun className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {current ? <NumberFlow value={current.precipitation || 0} suffix={current.precipitation_unit || ' mm'} /> : '--'}
                        </div>
                        <p className="text-xs text-muted-foreground">Current precipitation</p>
                    </CardContent>
                </Card>
            </div>

            {/* Historical Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {chartLoading && !historicalData.length ? (
                    <div className="col-span-full h-64 flex items-center justify-center border rounded-xl bg-card/50">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        <IndoorOutdoorChart
                            title={`${tempRange} Temperature History`}
                            sensorType="temperature"
                            indoorData={[]}
                            outdoorData={historicalData}
                            onRangeChange={setTempRange}
                        />
                        <IndoorOutdoorChart
                            title={`${humidityRange} Humidity History`}
                            sensorType="humidity"
                            indoorData={[]}
                            outdoorData={historicalData}
                            onRangeChange={setHumidityRange}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default Weather;
