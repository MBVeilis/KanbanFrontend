export type ColumnId = 'backlog' | 'todo' | 'in-progress' | 'qa-test' | 'done'

export interface Task {
  id: string
  title: string
  completed: boolean
}

export interface UserStory {
  id: string
  type: 'user-story'
  title: string
  description: string
  tasks: Task[]
  assignee: string
  estimation: number
  columnId: ColumnId
}

export interface BugUserStory {
  id: string
  type: 'bug'
  title: string
  description: string
  assignee: string
  estimation: number
  relatedUserStoryId: string
  columnId: ColumnId
}

export type KanbanItem = UserStory | BugUserStory
