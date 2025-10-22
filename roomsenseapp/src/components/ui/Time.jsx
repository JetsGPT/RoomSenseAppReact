import React, { useState, useEffect } from 'react'

function Time({ className = "", format = "24h", showSeconds = false }) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date) => {
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const seconds = date.getSeconds()

    if (format === "12h") {
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
      const ampm = hours >= 12 ? 'PM' : 'AM'
      const timeString = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      const fullString = showSeconds 
        ? `${timeString}:${seconds.toString().padStart(2, '0')} ${ampm}`
        : `${timeString} ${ampm}`
      return fullString
    } else {
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      return showSeconds 
        ? `${timeString}:${seconds.toString().padStart(2, '0')}`
        : timeString
    }
  }

  return (
    <time 
      className={`font-display text-foreground ${className}`}
      dateTime={currentTime.toISOString()}
    >
      {formatTime(currentTime)}
    </time>
  )
}

export default Time;
