import type { IUserModelStore } from "../interfaces.js";
import type { ProfileAttribute } from "../../types/internal.types.js";

export function createInMemoryUserModelStore(): IUserModelStore {
  // Map<userId, Map<attributeId, ProfileAttribute>>
  const store = new Map<string, Map<string, ProfileAttribute>>();

  return {
    async upsertAttribute(userId, attribute) {
      let userAttrs = store.get(userId);
      if (!userAttrs) {
        userAttrs = new Map();
        store.set(userId, userAttrs);
      }
      userAttrs.set(attribute.id, structuredClone(attribute));
    },

    async getAttributes(userId) {
      const userAttrs = store.get(userId);
      if (!userAttrs) return [];
      return Array.from(userAttrs.values()).map((a) => structuredClone(a));
    },

    async deleteAttribute(userId, attributeId) {
      const userAttrs = store.get(userId);
      if (userAttrs) {
        userAttrs.delete(attributeId);
      }
    },

    async getAttribute(userId, attributeId) {
      const userAttrs = store.get(userId);
      if (!userAttrs) return null;
      const attr = userAttrs.get(attributeId);
      return attr ? structuredClone(attr) : null;
    },
  };
}
