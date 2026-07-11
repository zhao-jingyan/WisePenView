import { useMount, useUnmount, useUpdateEffect } from 'ahooks';
import { useRef, useState } from 'react';

import { useUserService } from '@/domains';
import type { User } from '@/domains/User';

export function useActiveCommentUser(commentsEnabled: boolean): User | null {
  const userService = useUserService();
  const [commentUser, setCommentUser] = useState<User | null>(null);
  const requestSeqRef = useRef(0);

  const syncCommentUser = () => {
    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;

    if (!commentsEnabled) {
      setCommentUser(null);
      return;
    }

    void userService
      .getUserInfo()
      .then((user) => {
        if (requestSeqRef.current === requestSeq) {
          setCommentUser(user);
        }
      })
      .catch(() => {
        if (requestSeqRef.current === requestSeq) {
          setCommentUser(null);
        }
      });
  };

  useMount(() => {
    syncCommentUser();
  });

  useUpdateEffect(() => {
    syncCommentUser();
  }, [commentsEnabled, userService]);

  useUnmount(() => {
    requestSeqRef.current += 1;
  });

  return commentUser;
}
