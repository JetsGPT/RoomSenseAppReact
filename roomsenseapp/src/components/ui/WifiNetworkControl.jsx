import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  Lock,
  RefreshCw,
  TriangleAlert,
  Wifi,
  WifiOff,
} from "lucide-react"

import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import { systemAPI } from "@/services/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const buildApiError = (error, fallback) =>
  error?.response?.data?.error
  || error?.response?.data?.detail
  || error?.message
  || fallback

export default function WifiNetworkControl() {
  const { user } = useAuth()
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [systemInfo, setSystemInfo] = useState(null)
  const [statusError, setStatusError] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [networks, setNetworks] = useState([])
  const [networkError, setNetworkError] = useState(null)
  const [loadingNetworks, setLoadingNetworks] = useState(false)
  const [selectedNetwork, setSelectedNetwork] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [dialogError, setDialogError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [switchingState, setSwitchingState] = useState(null)

  const isAdmin = user?.role === "admin"

  const loadStatus = useCallback(async ({ silent = false } = {}) => {
    if (!isAdmin) {
      return
    }

    if (!silent) {
      setLoadingStatus(true)
    }

    try {
      const info = await systemAPI.getInfo()
      setSystemInfo(info)
      setStatusError(null)
    } catch (error) {
      setStatusError(buildApiError(error, "Failed to load Wi-Fi status."))
    } finally {
      if (!silent) {
        setLoadingStatus(false)
      }
    }
  }, [isAdmin])

  const loadNetworks = useCallback(async () => {
    setLoadingNetworks(true)
    setNetworkError(null)

    try {
      const payload = await systemAPI.getWifiNetworks()
      setNetworks(Array.isArray(payload?.networks) ? payload.networks : [])
      setSystemInfo((previous) => ({
        ...previous,
        wifiSupported: Boolean(payload?.wifiSupported),
        wifiConnected: Boolean(payload?.current?.connected),
        wifiSsid: payload?.current?.ssid || null,
        wifiInterface: payload?.current?.interface || null,
      }))
    } catch (error) {
      setNetworkError(buildApiError(error, "Failed to scan Wi-Fi networks."))
    } finally {
      setLoadingNetworks(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  useEffect(() => {
    if (!isAdmin || switchingState) {
      return undefined
    }

    const interval = window.setInterval(() => {
      loadStatus({ silent: true })
    }, 60000)

    return () => window.clearInterval(interval)
  }, [isAdmin, loadStatus, switchingState])

  useEffect(() => {
    if (!popoverOpen || switchingState) {
      return
    }

    loadNetworks()
  }, [popoverOpen, loadNetworks, switchingState])

  const currentSsid = systemInfo?.wifiSsid || null
  const wifiSupported = Boolean(systemInfo?.wifiSupported)
  const wifiConnected = Boolean(systemInfo?.wifiConnected)
  const currentInterface = systemInfo?.wifiInterface || null

  const triggerLabel = useMemo(() => {
    if (switchingState?.ssid) {
      return `Switching to ${switchingState.ssid}`
    }

    if (loadingStatus && !systemInfo) {
      return "Loading Wi-Fi"
    }

    if (!wifiSupported) {
      return "Wi-Fi unavailable"
    }

    if (wifiConnected && currentSsid) {
      return currentSsid
    }

    return "Wi-Fi disconnected"
  }, [currentSsid, loadingStatus, switchingState, systemInfo, wifiConnected, wifiSupported])

  const passwordRequired = Boolean(selectedNetwork?.requiresPassword && !selectedNetwork?.isSaved)

  const openSwitchDialog = (network) => {
    setSelectedNetwork(network)
    setPassword("")
    setDialogError(null)
    setDialogOpen(true)
  }

  const handleConfirmSwitch = async () => {
    if (!selectedNetwork || submitting) {
      return
    }

    if (passwordRequired && !password) {
      setDialogError("Enter the Wi-Fi password before continuing.")
      return
    }

    try {
      setSubmitting(true)
      setDialogError(null)
      const result = await systemAPI.connectWifi({
        ssid: selectedNetwork.ssid,
        password: passwordRequired ? password : null,
      })

      setDialogOpen(false)
      setPopoverOpen(false)
      setSwitchingState({
        ssid: selectedNetwork.ssid,
        message: result?.message
          || `RoomSense is switching to ${selectedNetwork.ssid}. The app will disappear while the Raspberry Pi reconnects, and this can take a few minutes.`,
      })
    } catch (error) {
      setDialogError(buildApiError(error, "Failed to switch the Raspberry Pi to the selected Wi-Fi network."))
    } finally {
      setSubmitting(false)
    }
  }

  if (!isAdmin) {
    return null
  }

  const TriggerIcon = wifiSupported ? Wifi : WifiOff

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2 px-2.5"
            disabled={Boolean(switchingState)}
          >
            {switchingState ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <TriggerIcon
                size={14}
                className={cn(
                  wifiSupported
                    ? (wifiConnected ? "text-emerald-600" : "text-amber-600")
                    : "text-muted-foreground"
                )}
              />
            )}
            <span className="hidden lg:inline max-w-32 truncate text-xs font-medium">
              {triggerLabel}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[24rem] p-0">
          <div className="border-b px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">Raspberry Pi Wi-Fi</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {currentSsid
                    ? `Currently connected to ${currentSsid}${currentInterface ? ` via ${currentInterface}` : ""}.`
                    : wifiSupported
                      ? "The Raspberry Pi is not currently connected to Wi-Fi."
                      : "This backend does not currently expose Raspberry Pi Wi-Fi controls."}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={loadNetworks}
                disabled={loadingNetworks || !wifiSupported}
                title="Refresh Wi-Fi networks"
              >
                <RefreshCw size={14} className={cn(loadingNetworks && "animate-spin")} />
              </Button>
            </div>
          </div>

          <div className="space-y-3 p-4">
            {statusError && !systemInfo && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {statusError}
              </div>
            )}

            {!wifiSupported && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-700">
                Wi-Fi switching is unavailable until the Raspberry Pi host helper is installed and running.
              </div>
            )}

            {networkError && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {networkError}
              </div>
            )}

            {wifiSupported && !networkError && (
              <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
                Switching Wi-Fi will make RoomSense disappear while the Pi reconnects. The device may return on a different IP address, and this can take a few minutes.
              </div>
            )}

            {wifiSupported && (
              <div className="space-y-2">
                {loadingNetworks ? (
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-6 text-sm text-muted-foreground">
                    <RefreshCw size={14} className="animate-spin" />
                    Scanning nearby Wi-Fi networks...
                  </div>
                ) : networks.length > 0 ? (
                  networks.map((network) => (
                    <button
                      key={network.ssid}
                      type="button"
                      className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-background px-3 py-3 text-left transition-colors hover:bg-accent"
                      onClick={() => openSwitchDialog(network)}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">
                            {network.ssid}
                          </span>
                          {network.isCurrent && (
                            <Badge variant="success" className="shrink-0">
                              Current
                            </Badge>
                          )}
                          {!network.isCurrent && network.isSaved && (
                            <Badge variant="outline" className="shrink-0">
                              Saved
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          {network.requiresPassword ? <Lock size={12} /> : <CheckCircle2 size={12} />}
                          <span>{network.requiresPassword ? (network.isSaved ? "Secured, saved credentials available" : "Secured network") : "Open network"}</span>
                        </div>
                      </div>
                      <div className="ml-4 shrink-0 text-right text-xs text-muted-foreground">
                        <div>{Number.isFinite(network.signal) ? `${network.signal}%` : "Signal unknown"}</div>
                        <div className="mt-1">{network.security || "Open"}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                    No visible Wi-Fi networks were found for the Raspberry Pi.
                  </div>
                )}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch Raspberry Pi Wi-Fi</DialogTitle>
            <DialogDescription>
              RoomSense will disappear while the Raspberry Pi changes Wi-Fi. Reconnecting can take a few minutes, and the device may come back on a different IP address.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <div className="text-sm font-medium text-foreground">{selectedNetwork?.ssid || "Selected network"}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {passwordRequired
                  ? "This secured network needs a password before the Raspberry Pi can connect."
                  : selectedNetwork?.isSaved
                    ? "Saved credentials will be reused for this secured network."
                    : "This network does not require a password."}
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <div className="flex items-start gap-2">
                <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                <span>
                  The current RoomSense page will likely stop responding during the switch. Wait a few minutes before trying the new network address.
                </span>
              </div>
            </div>

            {passwordRequired && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="wifi-password-input">
                  Wi-Fi password
                </label>
                <Input
                  id="wifi-password-input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter the Wi-Fi password"
                  autoComplete="current-password"
                />
              </div>
            )}

            {dialogError && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {dialogError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmSwitch} disabled={submitting}>
              {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Wifi size={14} />}
              Switch Wi-Fi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(switchingState)} onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setSwitchingState(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changing Raspberry Pi Wi-Fi</DialogTitle>
            <DialogDescription>
              RoomSense will disappear while the Raspberry Pi reconnects. This can take a few minutes.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <RefreshCw size={16} className="mt-0.5 shrink-0 animate-spin" />
              <div>
                <div className="font-medium text-foreground">
                  {switchingState?.ssid ? `Switching to ${switchingState.ssid}` : "Switching Wi-Fi"}
                </div>
                <div className="mt-1">
                  {switchingState?.message}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSwitchingState(null)}>
              Dismiss
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
