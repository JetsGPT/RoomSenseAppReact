import { AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { getLocalCertificateDownloadUrl } from '../../lib/runtimeRecovery';

export default function BootstrapRecoveryPanel({ issue, className = '' }) {
    const title = issue?.title || 'RoomSense needs attention';
    const message = issue?.message || 'RoomSense could not finish loading the local service state.';

    return (
        <div className={`rounded-3xl border border-amber-200 bg-amber-50/95 p-6 text-left shadow-sm ${className}`}>
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="space-y-3">
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight text-amber-950">{title}</h2>
                        <p className="mt-2 text-sm leading-6 text-amber-900">{message}</p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button asChild variant="outline" size="lg" className="border-amber-300 bg-white text-amber-950 hover:bg-amber-100">
                            <a href={getLocalCertificateDownloadUrl()} download="roomsense-rootCA.crt">
                                <Download className="h-4 w-4" />
                                Install Local Certificate
                            </a>
                        </Button>
                        <Button type="button" size="lg" onClick={() => window.location.reload()}>
                            <RefreshCw className="h-4 w-4" />
                            Reload Page
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
