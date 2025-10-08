import React from 'react';
import { logInfo } from '../../../../lib/debug';

export function No_Bitmoji_Icon({ size }: { size: number }) {
  return (
    <svg version="1.1" x="0px" y="0px" viewBox="0 -5 90 90" width={size} height={size}>
      <path
        fill="#888"
        stroke="rgba(0,0,0,0.2)"
        stroke-width="1.5"
        d="M45,85.1c10.8,0,20.8-3.8,28.6-10.2c-1.4-2.1-3-3.6-4.7-5c-5.2-4.1-12.6-5.6-17.7-6.5l-0.2-2 c7.8-4.6,9.7-9.5,12.8-19.8l0.1-0.7c0,0,2.7-1.1,3.1-6.1c0.6-6.8-2.2-4.8-2.2-5.3C65.1,26,65,21.4,64,18c-2.1-7.3-9.2-13.1-19-13.1 S28.1,10.6,26,18c-1,3.4-1.1,8-0.8,11.6c0,0.5-2.7-1.5-2.2,5.3c0.4,5,3.1,6.1,3.1,6.1l0.1,0.7c3.1,10.3,5,15.2,12.8,19.8l-0.2,2 c-5,0.9-12.5,2.4-17.7,6.5c-1.7,1.4-3.3,2.9-4.7,5C24.2,81.3,34.2,85.1,45,85.1z"
      />
    </svg>
  );
}

const getBitmojiUrl = (user?: { bitmoji_selfie_id?: string; bitmoji_avatar_id?: string }) => {
  let iconUrl = undefined;
  if (user?.bitmoji_selfie_id != null && user?.bitmoji_avatar_id != null) {
    iconUrl = `https://sdk.bitmoji.com/render/panel/${user.bitmoji_selfie_id}-${user.bitmoji_avatar_id}-v1.webp?transparent=1&scale=0&bbs=true&ua=2`;
  } else if (user?.bitmoji_avatar_id != null) {
    iconUrl = `https://sdk.bitmoji.com/render/panel/${user.bitmoji_avatar_id}-v1.webp?transparent=1&scale=0&bbs=true&ua=2`;
  }
  return iconUrl;
};

export function Group_Bitmoji_Icon({
  size,
  users,
}: {
  size: number;
  users: Array<{ user: { bitmoji_selfie_id?: string; bitmoji_avatar_id?: string } }>;
}) {
  const selectThreeUsersWithBitmojis = () => {
    if (!users || users.length === 0) {
      return [undefined, undefined, undefined];
    }

    const usersWithBitmoji = users
      .map((userData) => {
        // @ts-ignore
        const url = getBitmojiUrl(userData);
        return url !== undefined ? userData : null;
      })
      .filter((userData): userData is NonNullable<typeof userData> => userData !== null);

    if (usersWithBitmoji.length === 0) {
      return [undefined, undefined, undefined];
    }

    const shuffled = [...usersWithBitmoji].sort(() => 0.5 - Math.random());
    const uniqueCount = Math.min(usersWithBitmoji.length, 3);
    const selected = shuffled.slice(0, uniqueCount);

    return selected;
  };

  const selectedUsers = selectThreeUsersWithBitmojis();
  const [userData0, userData1, userData2] = selectedUsers;

  // @ts-ignore
  const iconUrl0 = getBitmojiUrl(userData0);
  // @ts-ignore
  const iconUrl1 = getBitmojiUrl(userData1);
  // @ts-ignore
  const iconUrl2 = getBitmojiUrl(userData2);

  return (
    <div
      style={{
        flexShrink: 0,
        borderRadius: '50%',
        background: '#121212',
        border: '2px solid rgba(0,0,0,0)',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          display: 'flex',
          borderRadius: '50%',
          direction: 'ltr',
        }}
      >
        <div style={{ width: size * 3, display: 'flex' }}>
          <div style={{ width: size * 0.8, height: size * 0.8, position: 'relative' }}>
            <img
              role="presentation"
              src={iconUrl1}
              style={{
                left: '80%',
                top: '15%',
                opacity: 0.5,
                imageRendering: 'auto',
                position: 'absolute',
                userSelect: 'none',
                pointerEvents: 'unset',
                borderRadius: '100%',
                width: '100%',
                height: 'auto',
              }}
            />
          </div>
          <div style={{ width: size * 0.8, height: size * 0.8, position: 'relative' }}>
            <img
              role="presentation"
              src={iconUrl2}
              style={{
                left: '70%',
                top: '15%',
                opacity: 0.5,
                imageRendering: 'auto',
                position: 'absolute',
                userSelect: 'none',
                pointerEvents: 'unset',
                borderRadius: '100%',
                width: '100%',
                height: 'auto',
              }}
            />
          </div>
          <div style={{ width: size * 1.2, height: size * 1.2, position: 'relative' }}>
            <img
              role="presentation"
              src={iconUrl0}
              style={{
                right: '66%',
                bottom: '-15%',
                opacity: 1,
                imageRendering: 'auto',
                position: 'absolute',
                userSelect: 'none',
                pointerEvents: 'unset',
                borderRadius: '100%',
                width: '100%',
                height: 'auto',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
