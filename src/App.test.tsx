import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('Kanban board', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Backend unavailable')),
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows all board columns and demo stories', async () => {
    render(<App />)

    expect(await screen.findByText('Backlog')).toBeInTheDocument()
    expect(screen.getByText('To Do')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('QA Test')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.getByText('Opret en ny bruger')).toBeInTheDocument()
  })

  it('creates a user story locally', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: '+ Ny userstory' }))

    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Titel'), 'Betalingsflow')
    await user.type(within(dialog).getByLabelText('Beskrivelse'), 'En bruger kan gennemføre betaling')
    await user.type(within(dialog).getByLabelText('Tasks (én per linje)'), 'Tilføj knap')
    await user.type(within(dialog).getByLabelText('Ansvarlig'), 'Freja')
    await user.clear(within(dialog).getByLabelText('Estimation'))
    await user.type(within(dialog).getByLabelText('Estimation'), '8')
    await user.click(within(dialog).getByRole('button', { name: 'Opret userstory' }))

    expect(await screen.findByText('Betalingsflow')).toBeInTheDocument()
    expect(screen.getByText('Tilføj knap')).toBeInTheDocument()
  })

  it('creates a bug story linked to a user story', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: '+ Ny Bug userstory' }))

    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Titel'), 'Login fejler')
    await user.type(within(dialog).getByLabelText('Beskrivelse'), 'Login sender en fejl')
    await user.type(within(dialog).getByLabelText('Ansvarlig'), 'Mads')
    await user.click(within(dialog).getByRole('button', { name: 'Opret bug' }))

    expect(await screen.findByText('Login fejler')).toBeInTheDocument()
    expect(screen.getAllByText('Opret en ny bruger').length).toBeGreaterThanOrEqual(2)
  })

  it('toggles a task checkbox', async () => {
    const user = userEvent.setup()
    render(<App />)

    const checkbox = await screen.findByRole('checkbox', { name: 'Tilføj validering' })
    expect(checkbox).not.toBeChecked()

    await user.click(checkbox)
    expect(checkbox).toBeChecked()
  })

  it('edits an existing user story', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Rediger Opret en ny bruger' }))

    const dialog = screen.getByRole('dialog')
    const title = within(dialog).getByLabelText('Titel')
    await user.clear(title)
    await user.type(title, 'Brugeroprettelse opdateret')
    await user.click(within(dialog).getByRole('button', { name: 'Gem ændringer' }))

    expect(await screen.findByText('Brugeroprettelse opdateret')).toBeInTheDocument()
  })

  it('does not create duplicate task keys when a task title is repeated', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: '+ Ny userstory' }))
    const dialog = screen.getByRole('dialog')

    await user.type(within(dialog).getByLabelText('Titel'), 'Story med gentagelse')
    await user.type(within(dialog).getByLabelText('Beskrivelse'), 'Beskrivelse')
    await user.type(within(dialog).getByLabelText('Tasks (én per linje)'), 'Samme task\nSamme task')
    await user.type(within(dialog).getByLabelText('Ansvarlig'), 'Anna')
    await user.click(within(dialog).getByRole('button', { name: 'Opret userstory' }))

    expect(await screen.findAllByText('Samme task')).toHaveLength(1)
  })
})