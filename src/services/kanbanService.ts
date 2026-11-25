import { api } from './api'
import type { BugUserStory, ColumnId, KanbanItem, UserStory } from '../types'

const USER_STORIES_PATH = '/api/userstories'
const BUG_USER_STORIES_PATH = '/api/buguserstories'

export const kanbanService = {
  async getItems(): Promise<KanbanItem[]> {
    const [userStories, bugs] = await Promise.all([
      api.get<UserStory[]>(USER_STORIES_PATH),
      api.get<BugUserStory[]>(BUG_USER_STORIES_PATH),
    ])

    return [...userStories, ...bugs]
  },

  async createUserStory(story: Omit<UserStory, 'id' | 'type'>): Promise<UserStory> {
    return api.post<UserStory>(USER_STORIES_PATH, story)
  },

  async createBugStory(story: Omit<BugUserStory, 'id' | 'type'>): Promise<BugUserStory> {
    return api.post<BugUserStory>(BUG_USER_STORIES_PATH, story)
  },

  async updateColumn(
    item: KanbanItem,
    columnId: ColumnId,
  ): Promise<KanbanItem> {
    const path =
      item.type === 'bug'
        ? `${BUG_USER_STORIES_PATH}/${item.id}`
        : `${USER_STORIES_PATH}/${item.id}`

    return api.patch<KanbanItem>(path, { columnId })
  },

  async updateUserStory(story: UserStory): Promise<UserStory> {
    return api.put<UserStory>(`${USER_STORIES_PATH}/${story.id}`, story)
  },

  async deleteItem(item: KanbanItem): Promise<void> {
    const path =
      item.type === 'bug'
        ? `${BUG_USER_STORIES_PATH}/${item.id}`
        : `${USER_STORIES_PATH}/${item.id}`

    return api.delete(path)
  },
}
