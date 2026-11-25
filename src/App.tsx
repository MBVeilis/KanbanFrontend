import { useEffect, useState, type DragEvent, type FormEvent } from 'react'
import './App.css'
import { kanbanService } from './services/kanbanService'
import type { BugUserStory, ColumnId, KanbanItem, Task, UserStory } from './types'

const columns: { id: ColumnId; title: string }[] = 
[
  { id: 'backlog', title: 'Backlog' },
  { id: 'todo', title: 'To Do' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'qa-test', title: 'QA Test' },
  { id: 'done', title: 'Done' },
]

const initialItems: KanbanItem[] = 
[
  {
    id: 'story-1',
    type: 'user-story',
    title: 'Opret en ny bruger',
    description: 'Som bruger vil jeg oprette en konto, så jeg kan gemme mine boards.',
    tasks: [
      { id: 'task-1', title: 'Lav oprettelsesformular', completed: true },
      { id: 'task-2', title: 'Tilføj validering', completed: false },
      { id: 'task-3', title: 'Forbind formularen til API', completed: false },
    ],
    assignee: 'Anna',
    estimation: 5,
    columnId: 'backlog',
  },
  {
    id: 'story-2',
    type: 'user-story',
    title: 'Filtrer kanban-kort',
    description: 'Som bruger vil jeg filtrere kort, så jeg hurtigt kan finde opgaver.',
    tasks: [
      { id: 'task-4', title: 'Tilføj søgefelt', completed: true },
      { id: 'task-5', title: 'Implementer filterlogik', completed: false },
    ],
    assignee: 'Mikkel',
    estimation: 3,
    columnId: 'in-progress',
  },
  {
    id: 'bug-1',
    type: 'bug',
    title: 'Kort forsvinder efter refresh',
    description: 'Et flyttet kort vender tilbage til sin gamle kolonne efter genindlæsning.',
    assignee: 'Sara',
    estimation: 2,
    relatedUserStoryId: 'story-2',
    columnId: 'qa-test',
  },
]

type StoryForm = 'user' | 'bug' | null

interface StoryDraft {
  title: string
  description: string
  assignee: string
  estimation: number
  tasks: string
  relatedUserStoryId: string
  columnId: ColumnId
}

const emptyDraft: StoryDraft = {
  title: '',
  description: '',
  assignee: '',
  estimation: 1,
  tasks: '',
  relatedUserStoryId: '',
  columnId: 'backlog',
}

const createTaskId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `task-${crypto.randomUUID()}`
    : `task-${Date.now()}-${Math.random().toString(36).slice(2)}`

const uniqueTaskTitles = (tasks: string) =>
  [...new Set(tasks.split('\n').map((task) => task.trim()).filter(Boolean))]

function App() {
  const [items, setItems] = useState<KanbanItem[]>(initialItems)
  const [form, setForm] = useState<StoryForm>(null)
  const [draft, setDraft] = useState<StoryDraft>(emptyDraft)
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [backendMessage, setBackendMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    kanbanService
      .getItems()
      .then((data) => {
        if (!cancelled && data.length > 0) setItems(data)
      })
      .catch(() => {
        if (!cancelled) {
          setBackendMessage('Backend er endnu ikke tilgængelig. Demo-data vises lokalt.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const openForm = (type: StoryForm) => {
    setDraft({
      ...emptyDraft,
      relatedUserStoryId:
        type === 'bug'
          ? items.find((item) => item.type === 'user-story')?.id ?? ''
          : '',
    })
    setForm(type)
  }

  const closeForm = () => {
    setForm(null)
    setEditingStoryId(null)
    setDraft(emptyDraft)
  }

  const openEditForm = (story: UserStory) => {
    setEditingStoryId(story.id)
    setForm('user')
    setDraft({
      title: story.title,
      description: story.description,
      assignee: story.assignee,
      estimation: story.estimation,
      tasks: story.tasks.map((task) => task.title).join('\n'),
      relatedUserStoryId: '',
      columnId: story.columnId,
    })
  }

  const submitStory = async (event: FormEvent) => {
    event.preventDefault()
    if (!draft.title.trim() || !draft.description.trim() || !draft.assignee.trim()) return

    try {
      if (form === 'user') {
        const story: Omit<UserStory, 'id' | 'type'> = {
          title: draft.title.trim(),
          description: draft.description.trim(),
          assignee: draft.assignee.trim(),
          estimation: draft.estimation,
          tasks: draft.tasks
            ? uniqueTaskTitles(draft.tasks).map((task) => ({
                id: createTaskId(),
                title: task,
                completed: false,
              }))
            : [],
          columnId: draft.columnId,
        }
        if (editingStoryId) {
          const existing = items.find(
            (item): item is UserStory =>
              item.id === editingStoryId && item.type === 'user-story',
          )
          if (existing) {
            const updated: UserStory = {
              ...existing,
              ...story,
              tasks: story.tasks.map((task) => {
                const previous = existing.tasks.find(
                  (existingTask) => existingTask.title === task.title,
                )
                return previous ? { ...task, id: previous.id, completed: previous.completed } : task
              }),
            }
            const saved = await kanbanService.updateUserStory(updated)
            setItems((current) =>
              current.map((item) => item.id === editingStoryId ? saved : item),
            )
            closeForm()
            return
          }
        }
        const created = await kanbanService.createUserStory(story)
        setItems((current) => [...current, created])
      } else if (form === 'bug') {
        const bug: Omit<BugUserStory, 'id' | 'type'> = {
          title: draft.title.trim(),
          description: draft.description.trim(),
          assignee: draft.assignee.trim(),
          estimation: draft.estimation,
          relatedUserStoryId: draft.relatedUserStoryId,
          columnId: draft.columnId,
        }
        const created = await kanbanService.createBugStory(bug)
        setItems((current) => [...current, created])
      }
      closeForm()
    } catch {
      if (form === 'user' && editingStoryId) {
        setItems((current) =>
          current.map((item) => {
            if (item.id !== editingStoryId || item.type !== 'user-story') return item

            const taskTitles = draft.tasks
              .split('\n')
              .map((task) => task.trim())
              .filter(Boolean)

            return {
              ...item,
              title: draft.title.trim(),
              description: draft.description.trim(),
              assignee: draft.assignee.trim(),
              estimation: draft.estimation,
              columnId: draft.columnId,
              tasks: [...new Set(taskTitles)].map((title) => {
                const existingTask = item.tasks.find((task) => task.title === title)
                return existingTask ?? {
                  id: createTaskId(),
                  title,
                  completed: false,
                }
              }),
            }
          }),
        )
        setBackendMessage('Ændringen blev gemt lokalt, fordi backend endnu ikke er tilgængelig.')
        closeForm()
        return
      }

      const localId = `${form}-${Date.now()}`

      if (form === 'user') {
        const story: UserStory = {
          id: localId,
          type: 'user-story',
          title: draft.title.trim(),
          description: draft.description.trim(),
          assignee: draft.assignee.trim(),
          estimation: draft.estimation,
          tasks: uniqueTaskTitles(draft.tasks).map((task) => ({
            id: createTaskId(),
            title: task,
            completed: false,
          })),
          columnId: draft.columnId,
        }
        setItems((current) => [...current, story])
      } else if (form === 'bug') {
        const bug: BugUserStory = {
          id: localId,
          type: 'bug',
          title: draft.title.trim(),
          description: draft.description.trim(),
          assignee: draft.assignee.trim(),
          estimation: draft.estimation,
          relatedUserStoryId: draft.relatedUserStoryId,
          columnId: draft.columnId,
        }
        setItems((current) => [...current, bug])
      }

      setBackendMessage('Kortet blev gemt lokalt, fordi backend endnu ikke er tilgængelig.')
      closeForm()
    }
  }

  const handleDrop = async (columnId: ColumnId) => {
    const draggedItem = items.find((item) => item.id === draggedId)
    setDraggedId(null)
    if (!draggedItem || draggedItem.columnId === columnId) return

    setItems((current) =>
      current.map((item) => item.id === draggedItem.id ? { ...item, columnId } : item),
    )

    try {
      await kanbanService.updateColumn(draggedItem, columnId)
    } catch {
      setBackendMessage('Kolonnens ændring er gemt lokalt. Backend er ikke tilgængelig.')
    }
  }

  const toggleTask = (storyId: string, taskId: string) => {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== storyId || item.type !== 'user-story') return item
        return {
          ...item,
          tasks: item.tasks.map((task: Task) =>
            task.id === taskId ? { ...task, completed: !task.completed } : task,
          ),
        }
      }),
    )
  }

  const relatedTitle = (storyId: string) =>
    items.find((item) => item.id === storyId)?.title ?? 'Ukendt user story'

  return (
    <main className="kanban-app">
      <header className="topbar">
        <div>
          <p className="eyebrow">Project workspace</p>
          <h1>Kanban Board</h1>
        </div>
        <div className="header-actions">
          <button className="button secondary" type="button" onClick={() => openForm('bug')}>
            + Ny Bug userstory
          </button>
          <button className="button primary" type="button" onClick={() => openForm('user')}>
            + Ny userstory
          </button>
        </div>
      </header>

      {backendMessage && (
        <div className="notice" role="status">
          {backendMessage}
          <button type="button" aria-label="Luk besked" onClick={() => setBackendMessage(null)}>×</button>
        </div>
      )}

      {loading ? (
        <p className="loading">Indlæser board...</p>
      ) : (
        <section className="board" aria-label="Kanban board">
          {columns.map((column) => {
            const columnItems = items.filter((item) => item.columnId === column.id)
            return (
              <div
                className="column"
                key={column.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event: DragEvent) => {
                  event.preventDefault()
                  void handleDrop(column.id)
                }}
              >
                <div className="column-header">
                  <h2>{column.title}</h2>
                  <span className="count">{columnItems.length}</span>
                </div>
                <div className="card-list">
                  {columnItems.map((item) => (
                    <article
                      className={`card ${item.type === 'bug' ? 'bug-card' : ''}`}
                      draggable
                      key={item.id}
                      onDragStart={() => setDraggedId(item.id)}
                    >
                      <div className="card-heading">
                        <span className={`badge ${item.type}`}>
                          {item.type === 'bug' ? 'BUG' : 'STORY'}
                        </span>
                        <div className="card-heading-actions">
                          {item.type === 'user-story' && (
                            <button
                              className="edit-button"
                              type="button"
                              aria-label={`Rediger ${item.title}`}
                              onClick={() => openEditForm(item)}
                              draggable={false}
                            >
                              Rediger
                            </button>
                          )}
                        </div>
                      </div>
                      <h3>{item.title}</h3>
                      <p className="description">{item.description}</p>

                      {item.type === 'user-story' && item.tasks.length > 0 && (
                        <ul className="tasks">
                          {item.tasks.map((task) => (
                            <li key={task.id}>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={task.completed}
                                  onChange={() => toggleTask(item.id, task.id)}
                                />
                                <span className={task.completed ? 'completed' : ''}>{task.title}</span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}

                      {item.type === 'bug' && (
                        <p className="relation">
                          <span>Refererer til</span>
                          {relatedTitle(item.relatedUserStoryId)}
                        </p>
                      )}

                      <div className="card-footer">
                        <div className="assignee">
                          <span className="avatar">{item.assignee.charAt(0).toUpperCase()}</span>
                          <span>{item.assignee}</span>
                        </div>
                        <span className="estimate">{item.estimation} p</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )
          })}
        </section>
      )}

      {form && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeForm}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">{form === 'bug' ? 'Bug registrering' : editingStoryId ? 'Rediger opgave' : 'Ny opgave'}</p>
                <h2 id="form-title">{form === 'bug' ? 'Ny Bug userstory' : editingStoryId ? 'Rediger userstory' : 'Ny userstory'}</h2>
              </div>
              <button className="close-button" type="button" aria-label="Luk" onClick={closeForm}>×</button>
            </div>

            <form onSubmit={submitStory}>
              <label>
                Titel
                <input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Skriv en kort titel" />
              </label>
              <label>
                Beskrivelse
                <textarea required rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Beskriv userstoryen" />
              </label>

              {form === 'user' && (
                <label>
                  Tasks (én per linje)
                  <textarea rows={4} value={draft.tasks} onChange={(event) => setDraft({ ...draft, tasks: event.target.value })} placeholder={'Lav komponent\nTilføj tests'} />
                </label>
              )}

              {form === 'bug' && (
                <label>
                  Relateret userstory
                  <select required value={draft.relatedUserStoryId} onChange={(event) => setDraft({ ...draft, relatedUserStoryId: event.target.value })}>
                    {items.filter((item) => item.type === 'user-story').map((item) => (
                      <option key={item.id} value={item.id}>{item.title}</option>
                    ))}
                  </select>
                </label>
              )}

              <div className="form-row">
                <label>
                  Ansvarlig
                  <input required value={draft.assignee} onChange={(event) => setDraft({ ...draft, assignee: event.target.value })} placeholder="Navn" />
                </label>
                <label>
                  Estimation
                  <input required type="number" min="1" value={draft.estimation} onChange={(event) => setDraft({ ...draft, estimation: Number(event.target.value) })} />
                </label>
              </div>

              <label>
                Kolonne
                <select value={draft.columnId} onChange={(event) => setDraft({ ...draft, columnId: event.target.value as ColumnId })}>
                  {columns.map((column) => (
                    <option key={column.id} value={column.id}>{column.title}</option>
                  ))}
                </select>
              </label>

              <div className="modal-actions">
                <button className="button ghost" type="button" onClick={closeForm}>Annuller</button>
                <button className="button primary" type="submit">
                  {form === 'bug' ? 'Opret bug' : editingStoryId ? 'Gem ændringer' : 'Opret userstory'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

export default App