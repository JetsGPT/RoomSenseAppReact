import React, { useEffect, useState, useCallback, useRef } from 'react';
import { CloudSun, Wind, Droplets, Thermometer, MapPin, RefreshCw, Loader2, Search, Crosshair, Globe, Check } from 'lucide-react';
import { useWeather } from '../contexts/WeatherContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { IndoorOutdoorChart } from '../components/ui/IndoorOutdoorChart';
import { Input } from '../components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import NumberFlow from '@number-flow/react';
import { weatherAPI } from '../services/weatherAPI';

const Weather = () => {
    const { currentWeather, location, loading, locationLoading, error, refresh, getHistory, setLocation, autodetectLocation } = useWeather();
    const [historicalData, setHistoricalData] = useState([]);
    const [chartLoading, setChartLoading] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        const fetchHistory = async () => {
            if (locationLoading) return;
            setChartLoading(true);
            try {
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
    }, [getHistory, location, locationLoading]);

    // Handle search input with debounce
    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchQuery(val);

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        if (val.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const results = await weatherAPI.geocode(val);
                setSearchResults(results);
            } catch (err) {
                console.error("Geocoding failed", err);
            } finally {
                setSearching(false);
            }
        }, 500);
    };

    const handleSelectLocation = async (loc) => {
        try {
            const locName = loc.admin1 ? `${loc.name}, ${loc.admin1}` : loc.name;
            await setLocation(loc.latitude, loc.longitude, locName);
            setIsPopoverOpen(false);
            setSearchQuery('');
            setSearchResults([]);
        } catch (err) {
            console.error("Failed to set location", err);
        }
    };

    const handleAutodetect = async () => {
        try {
            await autodetectLocation();
            setIsPopoverOpen(false);
        } catch (err) {
            alert(err.message);
        }
    };

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
    const [tempRange, setTempRange] = useState('24h');
    const [humidityRange, setHumidityRange] = useState('24h');

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Weather</h1>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center text-muted-foreground">
                            <MapPin className="w-4 h-4 mr-1 text-primary" />
                            {locationLoading ? (
                                <span className="animate-pulse">Loading location...</span>
                            ) : (
                                <span className="font-medium text-foreground">{location.name}</span>
                            )}
                            <span className="mx-2 opacity-50">•</span>
                            <span className="text-xs">{location.latitude.toFixed(2)}°N, {location.longitude.toFixed(2)}°E</span>
                        </div>

                        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" title="Change location">
                                    <Globe className="w-4 h-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0 overflow-hidden" align="start">
                                <div className="p-3 border-b bg-muted/30">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search city..."
                                            className="pl-9 h-9 border-none bg-background focus-visible:ring-1"
                                            value={searchQuery}
                                            onChange={handleSearchChange}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto p-1">
                                    {searching ? (
                                        <div className="flex items-center justify-center py-6 text-muted-foreground">
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Searching...
                                        </div>
                                    ) : searchResults.length > 0 ? (
                                        searchResults.map((loc, idx) => (
                                            <button
                                                key={idx}
                                                className="w-full flex flex-col items-start p-2.5 rounded-md hover:bg-muted text-left transition-colors"
                                                onClick={() => handleSelectLocation(loc)}
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="font-medium">{loc.name}</span>
                                                    <span className="text-[10px] font-mono opacity-50 uppercase bg-muted px-1 rounded">{loc.countryCode}</span>
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {loc.admin1 ? `${loc.admin1}, ` : ''}{loc.country}
                                                </span>
                                            </button>
                                        ))
                                    ) : searchQuery.length >= 2 ? (
                                        <div className="py-6 text-center text-sm text-muted-foreground">
                                            No locations found
                                        </div>
                                    ) : (
                                        <div className="p-1 space-y-1">
                                            <button
                                                className="w-full flex items-center gap-2.5 p-2.5 rounded-md hover:bg-muted text-left text-sm transition-colors"
                                                onClick={handleAutodetect}
                                            >
                                                <Crosshair className="w-4 h-4 text-primary" />
                                                <span>Use current location</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Current Conditions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="overflow-hidden border-none shadow-sm bg-gradient-to-br from-background to-blue-500/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Temperature</CardTitle>
                        <Thermometer className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {current ? <NumberFlow value={current.temperature_2m} suffix={current.temperature_2m_unit || '°C'} /> : '--'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Outside air temperature</p>
                    </CardContent>
                </Card>
                <Card className="overflow-hidden border-none shadow-sm bg-gradient-to-br from-background to-blue-500/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Humidity</CardTitle>
                        <Droplets className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {current ? <NumberFlow value={current.relative_humidity_2m} suffix={current.relative_humidity_2m_unit || '%'} /> : '--'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Relative humidity</p>
                    </CardContent>
                </Card>
                <Card className="overflow-hidden border-none shadow-sm bg-gradient-to-br from-background to-blue-500/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Wind Speed</CardTitle>
                        <Wind className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {current ? <NumberFlow value={current.wind_speed_10m} suffix={current.wind_speed_10m_unit || ' km/h'} /> : '--'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">At 10m above ground</p>
                    </CardContent>
                </Card>
                <Card className="overflow-hidden border-none shadow-sm bg-gradient-to-br from-background to-blue-500/5">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Precipitation</CardTitle>
                        <CloudSun className="h-4 w-4 text-sky-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {current ? <NumberFlow value={current.precipitation || 0} suffix={current.precipitation_unit || ' mm'} /> : '--'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Current precipitation</p>
                    </CardContent>
                </Card>
            </div>

            {/* Historical Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {chartLoading && !historicalData.length ? (
                    <div className="col-span-full h-80 flex items-center justify-center border-2 border-dashed rounded-3xl bg-card/30 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
                            <span className="text-sm font-medium text-muted-foreground">Loading weather history...</span>
                        </div>
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
