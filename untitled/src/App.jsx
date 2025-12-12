import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import './App.css'

// Beispiel 1: JSX und Darstellung von Collections
// In diesem Beispiel wird eine Liste von Aufgaben (todos) als Array dargestellt
// und mit der Array-Funktion map() in JSX-Elemente umgewandelt.
// Wichtige Punkte:
// - JSX erlaubt es, JavaScript-Ausdrücke in geschweiften Klammern { } einzubetten.
// - Für Listen muss jedes Element ein eindeutiges key-Attribut bekommen.
// - Die Daten (todos) sind reine JavaScript-Daten, die Darstellung passiert in JSX.
function TodoListExample() {
  const todos = [
    { id: 1, title: 'React installieren', done: true },
    { id: 2, title: 'Erstes Component schreiben', done: false },
    { id: 3, title: 'Props und State üben', done: false },
  ]

  return (
    <div className="example-block">
      <h2>Beispiel 1: JSX &amp; Collections</h2>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id} className={todo.done ? 'done' : ''}>
            {todo.title} {todo.done ? '(erledigt)' : '(offen)'}
          </li>
        ))}
      </ul>
    </div>
  )
}

// Beispiel 2: Event Handler
// Hier wird gezeigt, wie man auf Benutzeraktionen reagiert.
// Wichtige Punkte:
// - Event-Handler werden als Funktion an z.B. onClick übergeben.
// - Die Funktion kann inline (Arrow Function) oder als benannte Funktion definiert werden.
// - Über das Event-Objekt (z.B. event.target.value) kann man auf Details zugreifen.
function EventHandlerExample() {
  function handleButtonClick() {
    alert('Button wurde geklickt!')
  }

  function handleInputChange(event) {
    console.log('Eingabe:', event.target.value)
  }

  return (
    <div className="example-block">
      <h2>Beispiel 2: Event Handler</h2>
      <button onClick={handleButtonClick}>Klick mich</button>
      <br />
      <input
        type="text"
        placeholder="Tippe etwas..."
        onChange={handleInputChange}
      />
    </div>
  )
}

// Beispiel 3: useState und useEffect Hooks
// useState:
// - Verwaltet lokalen Zustand in einer Funktionskomponente.
// - Gibt ein Array [wert, setFunktion] zurück.
// useEffect:
// - Reagiert auf Änderungen von Zuständen/Props oder auf das erste Rendern.
// - Wird für Nebenwirkungen wie Datenladen, Timer, Logging verwendet.
function HooksExample() {
  const [counter, setCounter] = useState(0)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    console.log('Counter hat sich geändert auf', counter)
  }, [counter])

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTime(new Date())
    }, 1000)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  return (
    <div className="example-block">
      <h2>Beispiel 3: useState &amp; useEffect</h2>
      <p>Counter: {counter}</p>
      <button onClick={() => setCounter(counter + 1)}>+1</button>
      <p>Uhrzeit: {time.toLocaleTimeString()}</p>
    </div>
  )
}

// Beispiel 4: Kommunikation über Props &amp; Callbacks
// Idee:
// - Parent-Komponente hält den Zustand (z.B. eine Liste von Namen).
// - Child-Komponenten bekommen Daten über Props.
// - Child-Komponenten rufen über Props-Callbacks Funktionen im Parent auf,
//   um den Zustand im Parent zu ändern.
function NameList({ names }) {
  return (
    <ul>
      {names.map((name) => (
        <li key={name}>{name}</li>
      ))}
    </ul>
  )
}

function AddNameForm({ onAddName }) {
  const [input, setInput] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    onAddName(input.trim())
    setInput('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Namen eingeben"
      />
      <button type="submit">Hinzufügen</button>
    </form>
  )
}

function PropsAndCallbacksExample() {
  const [names, setNames] = useState(['Alice', 'Bob'])

  const handleAddName = (newName) => {
    setNames((oldNames) => [...oldNames, newName])
  }

  return (
    <div className="example-block">
      <h2>Beispiel 4: Props &amp; Callbacks</h2>
      <AddNameForm onAddName={handleAddName} />
      <NameList names={names} />
    </div>
  )
}

// Beispiel 5: Einfaches Routing
// Für Routing verwenden wir react-router-dom.
// Wichtige Punkte:
// - BrowserRouter umschließt die App (in main.jsx, siehe Erklärung unten).
// - Routes enthält mehrere Route-Elemente.
// - Jedes Route-Element bekommt path und element.
// - Navigation z.B. über <Link>.
function HomePage() {
  return <h2>Startseite (Home)</h2>
}

function AboutPage() {
  return <h2>Über diese App</h2>
}

function RoutingExample() {
  return (
    <div className="example-block">
      <h2>Beispiel 5: Routing</h2>
      <p>Navigation mit Links (Client-Side-Routing, kein vollständiger Seiten-Reload):</p>
      <nav>
        <Link to="/">Home</Link> | <Link to="/about">About</Link>
      </nav>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </div>
  )
}

function App() {
  // ...bestehender Count-Code kann bleiben, aber wir fokussieren uns auf die Beispiele
  return (
    <BrowserRouter>
      <div className="app-root">
        <h1>React Lern-Beispiele</h1>
        <p>
          Diese Seite enthält kleine, isolierte Beispiele für typische
          Prüfungs-Themen: JSX, Events, Hooks, Props/Callbacks und Routing.
        </p>
        <TodoListExample />
        <EventHandlerExample />
        <HooksExample />
        <PropsAndCallbacksExample />
        <RoutingExample />
      </div>
    </BrowserRouter>
  )
}

export default App
