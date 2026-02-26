import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Trash2, Terminal, CheckCircle, XCircle } from 'lucide-react';
import { outsideProxyAPI } from '@/services/outsideServerAPI';
import { useOutsideServer } from '@/contexts/OutsideServerContext';
import { FadeIn } from '@/components/ui/PageTransition';

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

const ProxyTester = () => {
    const { isOutsideConnected } = useOutsideServer();

    const [boxId, setBoxId] = useState('');
    const [path, setPath] = useState('/');
    const [method, setMethod] = useState('GET');
    const [body, setBody] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Response
    const [response, setResponse] = useState(null);
    const [responseError, setResponseError] = useState(null);
    const [history, setHistory] = useState([]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!boxId.trim() || !path.trim()) return;

        setIsLoading(true);
        setResponse(null);
        setResponseError(null);

        const startTime = performance.now();

        try {
            let parsedBody = null;
            if (body.trim() && !['GET', 'DELETE'].includes(method)) {
                try {
                    parsedBody = JSON.parse(body);
                } catch {
                    setResponseError('Invalid JSON body');
                    setIsLoading(false);
                    return;
                }
            }

            const data = await outsideProxyAPI.request(boxId.trim(), path.trim(), method, parsedBody);
            const duration = Math.round(performance.now() - startTime);

            const result = {
                status: 'success',
                data,
                duration,
                method,
                path: path.trim(),
                boxId: boxId.trim(),
                timestamp: new Date().toISOString(),
            };

            setResponse(result);
            setHistory((prev) => [result, ...prev.slice(0, 19)]); // keep 20
        } catch (err) {
            const duration = Math.round(performance.now() - startTime);
            const status = err.response?.status || 'N/A';
            const detail = err.response?.data?.detail || err.response?.data || err.message || 'Request failed';

            const result = {
                status: 'error',
                httpStatus: status,
                error: typeof detail === 'string' ? detail : JSON.stringify(detail),
                duration,
                method,
                path: path.trim(),
                boxId: boxId.trim(),
                timestamp: new Date().toISOString(),
            };

            setResponseError(result);
            setHistory((prev) => [result, ...prev.slice(0, 19)]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = () => {
        setBoxId('');
        setPath('/');
        setMethod('GET');
        setBody('');
        setResponse(null);
        setResponseError(null);
    };

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6">
            <FadeIn>
                <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-3xl sm:text-4xl font-bold mb-2">Proxy Tester</h1>
                        <p className="text-sm sm:text-base text-muted-foreground">
                            Send requests through the Outside Server proxy to connected boxes
                        </p>
                    </motion.div>

                    {/* Server Status */}
                    {!isOutsideConnected && (
                        <Card className="border-red-500/40 bg-red-500/5">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                                    <div>
                                        <p className="font-medium text-red-700 dark:text-red-400">Outside Server is offline</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Proxy requests require a running Outside Server. Make sure it is started at localhost:8443.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Request Form */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Terminal className="h-5 w-5" />
                                Request Builder
                            </CardTitle>
                            <CardDescription>
                                Build and send HTTP requests to a remote sensor box via the proxy
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {/* Method */}
                                    <div className="space-y-2">
                                        <Label htmlFor="method">Method</Label>
                                        <select
                                            id="method"
                                            value={method}
                                            onChange={(e) => setMethod(e.target.value)}
                                            className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        >
                                            {METHODS.map((m) => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Box ID */}
                                    <div className="space-y-2">
                                        <Label htmlFor="boxId">Box ID</Label>
                                        <Input
                                            id="boxId"
                                            placeholder="box-uuid"
                                            value={boxId}
                                            onChange={(e) => setBoxId(e.target.value)}
                                            disabled={isLoading}
                                            required
                                        />
                                    </div>

                                    {/* Path */}
                                    <div className="space-y-2">
                                        <Label htmlFor="path">Path</Label>
                                        <Input
                                            id="path"
                                            placeholder="/api/sensors"
                                            value={path}
                                            onChange={(e) => setPath(e.target.value)}
                                            disabled={isLoading}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Body */}
                                {!['GET', 'DELETE'].includes(method) && (
                                    <div className="space-y-2">
                                        <Label htmlFor="body">Request Body (JSON)</Label>
                                        <textarea
                                            id="body"
                                            value={body}
                                            onChange={(e) => setBody(e.target.value)}
                                            placeholder='{"key": "value"}'
                                            disabled={isLoading}
                                            rows={4}
                                            className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm font-mono transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                                        />
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3">
                                    <Button type="submit" disabled={isLoading || !boxId.trim()}>
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="mr-2 h-4 w-4" />
                                                Send Request
                                            </>
                                        )}
                                    </Button>
                                    <Button type="button" variant="outline" onClick={handleClear} disabled={isLoading}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Clear
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Response */}
                    {(response || responseError) && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base">Response</CardTitle>
                                        <div className="flex items-center gap-2">
                                            {response ? (
                                                <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    Success
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive">
                                                    <XCircle className="h-3 w-3 mr-1" />
                                                    {responseError?.httpStatus || 'Error'}
                                                </Badge>
                                            )}
                                            <span className="text-xs text-muted-foreground">
                                                {(response || responseError)?.duration}ms
                                            </span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <pre className="p-4 rounded-lg bg-muted text-sm font-mono whitespace-pre-wrap break-all overflow-x-auto max-h-[400px] overflow-y-auto">
                                        {response
                                            ? JSON.stringify(response.data, null, 2)
                                            : responseError?.error || 'Unknown error'}
                                    </pre>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Request History */}
                    {history.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">History</CardTitle>
                                <CardDescription>Last {history.length} requests</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {history.map((entry, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-3 p-2 rounded-lg border text-sm hover:bg-accent/50 transition-colors"
                                        >
                                            <Badge variant={entry.status === 'success' ? 'outline' : 'destructive'} className="w-16 justify-center text-xs">
                                                {entry.method}
                                            </Badge>
                                            <span className="text-muted-foreground font-mono text-xs truncate flex-1">
                                                /proxy/{entry.boxId}{entry.path}
                                            </span>
                                            <span className="text-xs text-muted-foreground shrink-0">
                                                {entry.duration}ms
                                            </span>
                                            {entry.status === 'success' ? (
                                                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </FadeIn>
        </div>
    );
};

export default ProxyTester;
