import { createHash } from 'node:crypto'
import { PoolConnection, RowDataPacket } from 'mysql2/promise'
import { ThemeModel, UserModel } from '../types/models'
import * as fs from "fs";

export interface UserResponse {
  id: number
  name: string
  display_name: string
  description: string
  theme: {
    id: number
    dark_mode: boolean
  }
  icon_hash: string
}

export const fillUserResponseMap = new Map<number, UserResponse>()

export const fillUserResponse = async (
  conn: PoolConnection,
  user: Omit<UserModel, 'password'>,
  getFallbackUserIcon: () => Promise<Readonly<ArrayBuffer>>,
) => {
  let userResponse = fillUserResponseMap.get(user.id)
  if (userResponse) {
    return userResponse
  }

  const [[theme]] = await conn.query<(ThemeModel & RowDataPacket)[]>(
    'SELECT * FROM themes WHERE user_id = ?',
    [user.id],
  )

  // const [[icon]] = await conn.query<
  //   (Pick<IconModel, 'image'> & RowDataPacket)[]
  // >('SELECT image FROM icons WHERE user_id = ?', [user.id])

  const imagePath = `/home/isucon/webapp/img/${user.id}.jpg`;
  let image = toArrayBuffer(fs.readFileSync(imagePath, "binary")); 
  // let image = icon?.image

  if (!image) {
    image = await getFallbackUserIcon()
  }

  fillUserResponseMap.set(user.id,
    {
      id: user.id,
      name: user.name,
      display_name: user.display_name,
      description: user.description,
      theme: {
        id: theme.id,
        dark_mode: !!theme.dark_mode,
      },
      icon_hash: createHash('sha256').update(new Uint8Array(image)).digest('hex'),
    } satisfies UserResponse
  )

  return fillUserResponseMap.get(user.id)!
}

// ArrayBufferにする
function toArrayBuffer(buffer) {
  var ab = new ArrayBuffer(buffer.length);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buffer.length; ++i) {
      view[i] = buffer[i];
  }
  return ab;
}
