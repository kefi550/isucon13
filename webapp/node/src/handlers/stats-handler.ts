import { Context } from 'hono'
import { RowDataPacket } from 'mysql2/promise'
import { HonoEnvironment } from '../types/application'
import { verifyUserSessionMiddleware } from '../middlewares/verify-user-session-middleare'
import { throwErrorWith } from '../utils/throw-error-with'
import {
  LivecommentsModel,
  LivestreamsModel,
  ReactionsModel,
  UserModel,
} from '../types/models'
import { atoi } from '../utils/integer'

// GET /api/user/:username/statistics
export const getUserStatisticsHandler = [
  verifyUserSessionMiddleware,
  async (c: Context<HonoEnvironment, '/api/user/:username/statistics'>) => {
    const username = c.req.param('username')
    // ユーザごとに、紐づく配信について、累計リアクション数、累計ライブコメント数、累計売上金額を算出
    // また、現在の合計視聴者数もだす

    const conn = await c.get('pool').getConnection()
    await conn.beginTransaction()

    try {
      const [[user]] = await conn
        .query<(UserModel & RowDataPacket)[]>(
          'SELECT * FROM users WHERE name = ?',
          [username],
        )
        .catch(throwErrorWith('failed to get user'))

      if (!user) {
        await conn.rollback()
        return c.json('not found user that has the given username', 404)
      }

      // ランク算出
      const [[ranking]]  = await conn.query<({ username: string, rank: number } & RowDataPacket)[]>(`
        SELECT
          *
        FROM (
          SELECT
            u.name AS username,
            RANK() OVER (ORDER BY score (COUNT(r.id) + IFNULL(SUM(l2.tip), 0)) , username DESC) AS rank
          FROM users u
          INNER JOIN livestreams l ON l.user_id = u.id
          LEFT JOIN reactions r ON r.livestream_id = l.id
          LEFT JOIN livecomments l2 ON l2.livestream_id = l.id
          GROUP BY u.name
          ORDER BY score DESC, username DESC
        )
        WHERE
          username = ?
      `, [username])


      const [[[reactions]], [[comments]], [[tips]], [[viewers]], [[favoriteEmoji]]] = await Promise.all([
        conn.query<({count: number} & RowDataPacket)[]>(`
          SELECT
            COUNT(*)
          FROM
            livestreams l
          INNER JOIN 
            reactions r ON r.livestream_id = l.id
          WHERE
            l.user_id = ?
        `, [user.id]),
        conn.query<({count: number} & RowDataPacket)[]>(`
          SELECT
            COUNT(*)
          FROM
            livestreams l
          INNER JOIN 
            livecomments lc ON lc.livestream_id = l.id
          WHERE
            l.user_id = ?
        `, [user.id]),
        conn.query<({sum: number} & RowDataPacket)[]>(`
          SELECT
            IFNULL(SUM(lc.tip), 0) AS sum 
          FROM
            livestreams l
          INNER JOIN 
            livecomments lc ON lc.livestream_id = l.id
          WHERE
            l.user_id = ?
        `, [user.id]),
        conn.query<({sum: number} & RowDataPacket)[]>(`
          SELECT
            SUM(livestream_viewer_count)
          FROM
            livestreams l
          INNER JOIN 
            livestream_viewers_history h ON h.livestream_id = l.id
          WHERE
            l.user_id = ?
        `, [user.id]),
        conn
          .query<(Pick<ReactionsModel, 'emoji_name'> & RowDataPacket)[]>(
            `
              SELECT r.emoji_name
              FROM users u
              INNER JOIN livestreams l ON l.user_id = u.id
              INNER JOIN reactions r ON r.livestream_id = l.id
              WHERE u.id = ?
              GROUP BY emoji_name
              ORDER BY COUNT(*) DESC, emoji_name DESC
              LIMIT 1
            `,
            [user.id],
          )
      ])

      await conn.commit().catch(throwErrorWith('failed to commit'))

      return c.json({
        rank: ranking.rank,
        viewers_count: viewers.sum,
        total_reactions: reactions.count,
        total_livecomments: comments.count,
        total_tip: tips.sum,
        favorite_emoji: favoriteEmoji?.emoji_name,
      })
    } catch (error) {
      await conn.rollback()
      return c.text(`Internal Server Error\n${error}`, 500)
    } finally {
      await conn.rollback()
      conn.release()
    }
  },
]

// GET /api/livestream/:livestream_id/statistics
export const getLivestreamStatisticsHandler = [
  verifyUserSessionMiddleware,
  async (
    c: Context<HonoEnvironment, '/api/livestream/:livestream_id/statistics'>,
  ) => {
    const livestreamId = atoi(c.req.param('livestream_id'))
    if (livestreamId === false) {
      return c.text('livestream_id in path must be integer', 400)
    }

    const conn = await c.get('pool').getConnection()
    await conn.beginTransaction()

    try {
      const [[livestream]] = await conn
        .query<(LivestreamsModel & RowDataPacket)[]>(
          'SELECT * FROM livestreams WHERE id = ?',
          [livestreamId],
        )
        .catch(throwErrorWith('failed to get livestream'))
      if (!livestream) {
        await conn.rollback()
        return c.json('cannot get stats of not found livestream', 404)
      }

      const [livestreams] = await conn
        .query<(LivestreamsModel & RowDataPacket)[]>(
          'SELECT * FROM livestreams',
        )
        .catch(throwErrorWith('failed to get livestreams'))

      // ランク算出
      const ranking: {
        livestreamId: number
        title: string
        score: number
      }[] = []
      for (const livestream of livestreams) {
        const [[{ 'COUNT(*)': reactionCount }]] = await conn
          .query<({ 'COUNT(*)': number } & RowDataPacket)[]>(
            'SELECT COUNT(*) FROM livestreams l INNER JOIN reactions r ON l.id = r.livestream_id WHERE l.id = ?',
            [livestream.id],
          )
          .catch(throwErrorWith('failed to count reactions'))

        const [[{ 'IFNULL(SUM(l2.tip), 0)': totalTip }]] = await conn
          .query<
            ({ 'IFNULL(SUM(l2.tip), 0)': number | string } & RowDataPacket)[]
          >(
            'SELECT IFNULL(SUM(l2.tip), 0) FROM livestreams l INNER JOIN livecomments l2 ON l.id = l2.livestream_id WHERE l.id = ?',
            [livestream.id],
          )
          .catch(throwErrorWith('failed to count tips'))

        ranking.push({
          livestreamId: livestream.id,
          title: livestream.title,
          score: reactionCount + Number(totalTip),
        })
      }
      ranking.sort((a, b) => {
        if (a.score === b.score) return a.livestreamId - b.livestreamId
        return a.score - b.score
      })

      let rank = 1
      for (const r of ranking.toReversed()) {
        if (r.livestreamId === livestreamId) break
        rank++
      }

      // 視聴者数算出
      const [[{ 'COUNT(*)': viewersCount }]] = await conn
        .query<({ 'COUNT(*)': number } & RowDataPacket)[]>(
          'SELECT COUNT(*) FROM livestreams l INNER JOIN livestream_viewers_history h ON h.livestream_id = l.id WHERE l.id = ?',
          [livestreamId],
        )
        .catch(throwErrorWith('failed to count viewers'))

      // 最大チップ額
      const [[{ 'IFNULL(MAX(tip), 0)': maxTip }]] = await conn
        .query<({ 'IFNULL(MAX(tip), 0)': number } & RowDataPacket)[]>(
          'SELECT IFNULL(MAX(tip), 0) FROM livestreams l INNER JOIN livecomments l2 ON l2.livestream_id = l.id WHERE l.id = ?',
          [livestreamId],
        )
        .catch(throwErrorWith('failed to get max tip'))

      // リアクション数
      const [[{ 'COUNT(*)': totalReactions }]] = await conn
        .query<({ 'COUNT(*)': number } & RowDataPacket)[]>(
          'SELECT COUNT(*) FROM livestreams l INNER JOIN reactions r ON r.livestream_id = l.id WHERE l.id = ?',
          [livestreamId],
        )
        .catch(throwErrorWith('failed to count reactions'))

      // スパム報告数
      const [[{ 'COUNT(*)': totalReports }]] = await conn
        .query<({ 'COUNT(*)': number } & RowDataPacket)[]>(
          'SELECT COUNT(*) FROM livestreams l INNER JOIN livecomment_reports r ON r.livestream_id = l.id WHERE l.id = ?',
          [livestreamId],
        )
        .catch(throwErrorWith('failed to count reports'))

      await conn.commit().catch(throwErrorWith('failed to commit'))

      return c.json({
        rank,
        viewers_count: viewersCount,
        total_reactions: totalReactions,
        total_reports: totalReports,
        max_tip: maxTip,
      })
    } catch (error) {
      await conn.rollback()
      return c.text(`Internal Server Error\n${error}`, 500)
    } finally {
      await conn.rollback()
      conn.release()
    }
  },
] 
