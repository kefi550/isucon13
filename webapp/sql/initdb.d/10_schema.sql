USE `isupipe`;

-- ユーザ (配信者、視聴者)
CREATE TABLE `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `display_name` VARCHAR(255) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  UNIQUE `uniq_user_name` (`name`)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- プロフィール画像
CREATE TABLE `icons` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `image` LONGBLOB NOT NULL
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- ユーザごとのカスタムテーマ
CREATE TABLE `themes` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `dark_mode` BOOLEAN NOT NULL
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- ライブ配信
CREATE TABLE `livestreams` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` text NOT NULL,
  `playlist_url` VARCHAR(255) NOT NULL,
  `thumbnail_url` VARCHAR(255) NOT NULL,
  `start_at` BIGINT NOT NULL,
  `end_at` BIGINT NOT NULL
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- ライブ配信予約枠
CREATE TABLE `reservation_slots` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `slot` BIGINT NOT NULL,
  `start_at` BIGINT NOT NULL,
  `end_at` BIGINT NOT NULL
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- ライブストリームに付与される、サービスで定義されたタグ
CREATE TABLE `tags` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  UNIQUE `uniq_tag_name` (`name`)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- ライブ配信とタグの中間テーブル
CREATE TABLE `livestream_tags` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `livestream_id` BIGINT NOT NULL,
  `tag_id` BIGINT NOT NULL
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- ライブ配信視聴履歴
CREATE TABLE `livestream_viewers_history` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `livestream_id` BIGINT NOT NULL,
  `created_at` BIGINT NOT NULL
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- ライブ配信に対するライブコメント
CREATE TABLE `livecomments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `livestream_id` BIGINT NOT NULL,
  `comment` VARCHAR(255) NOT NULL,
  `tip` BIGINT NOT NULL DEFAULT 0,
  `created_at` BIGINT NOT NULL
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- ユーザからのライブコメントのスパム報告
CREATE TABLE `livecomment_reports` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `livestream_id` BIGINT NOT NULL,
  `livecomment_id` BIGINT NOT NULL,
  `created_at` BIGINT NOT NULL
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- 配信者からのNGワード登録
CREATE TABLE `ng_words` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `livestream_id` BIGINT NOT NULL,
  `word` VARCHAR(255) NOT NULL,
  `created_at` BIGINT NOT NULL
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE INDEX ng_words_word ON ng_words(`word`);

-- ライブ配信に対するリアクション
CREATE TABLE `reactions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT NOT NULL,
  `livestream_id` BIGINT NOT NULL,
  -- :innocent:, :tada:, etc...
  `emoji_name` VARCHAR(255) NOT NULL,
  `created_at` BIGINT NOT NULL
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

CREATE TABLE `user_statistics` (
  `user_id` BIGINT NOT NULL,
  `reaction_count` BIGINT NOT NULL,
  `livecomment_count` BIGINT NOT NULL,
  `tip_sum` BIGINT NOT NULL,
  `viewer_sum` BIGINT NOT NULL,
  `favorite_emoji_name` VARCHAR(255)

  foreign key (user_id) references users(id)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

create index icons_user_id on `icons` (`user_id`);
create index themes_user_id on `themes` (`user_id`);
create index livestreams_id on `livestreams` (`id` DESC);
create index livestreams_user_id on `livestreams` (`user_id`);
create index livestreams_playlist_url on `livestreams` (`playlist_url`);
create index livestreams_thumbnail_url on `livestreams` (`thumbnail_url`);
create index livestream_tags_livestream_id on `livestream_tags` (`livestream_id` DESC);
create index livestream_tags_tag_id on `livestream_tags` (`tag_id`);
create index livestream_tags_created_at on `livestream_tags` (`created_at` DESC);
create index livestream_viewers_history_user_id on `livestream_viewers_history` (`user_id`);
create index livestream_viewers_history_livestream_id on `livestream_viewers_history` (`livestream_id`);
create index livecomments_user_id on `livecomments` (`user_id`);
create index livecomments_livestream_id on `livecomments` (`livestream_id`);
create index livecomments_created_at on `livecomments` (`created_at` DESC);
create index livecomment_reports_user_id on `livecomment_reports` (`user_id`);
create index livecomment_reports_livestream_id on `livecomment_reports` (`livestream_id`);
create index livecomment_reports_livecomment_id on `livecomment_reports` (`livecomment_id`);
create index ng_words_user_id on `ng_words` (`user_id`);
create index ng_words_livestream_id on `ng_words` (`livestream_id`);
create index ng_words_created_at on `ng_words` (`created_at` DESC);
create index reactions_user_id on `reactions` (`user_id`);
create index reactions_livestream_id on `reactions` (`livestream_id`);
create index reactions_emoji_name on `reactions` (`emoji_name` DESC);
create index reactions_created_at on `reactions` (`created_at` DESC);
create index livecomments_live_stream_id_created_at on livecomments(livestream_id, created_at desc);
create index reactions_livestream_id_created_at on reactions(livestream_id,created_at desc);
create index user_statistics_reaction_count_tip_sum on user_statistics(reaction_count desc, tip_sum desc);


DROP TRIGGER IF EXISTS `user_insert`;
DELIMITER $$
$$
CREATE TRIGGER `user_insert` AFTER INSERT ON `users` FOR EACH ROW
BEGIN
  INSERT INTO `user_statistics` (`user_id`, `reaction_count`, `livecomment_count`, `tip_sum`, `livesteam_viewer_sum`, `favorite_emoji`)
  VALUES (NEW.id, 0, 0, 0, 0, NULL);
END;

DROP TRIGGER IF EXISTS `reactions_insert`;
DELIMITER $$
$$
CREATE TRIGGER `reactions_insert` AFTER INSERT ON `reactions` FOR EACH ROW
BEGIN
  UPDATE `user_statistics` SET `reaction_count` = (
    SELECT COUNT(*) FROM `reactions`
    WHERE `user_id` = NEW.user_id
    LIMIT 1
  ) WHERE `user_id` = NEW.user_id;
  UPDATE `user_statistics` SET `favorite_emoji_name` = (
    SELECT `emoji_name` FROM `reactions`
    WHERE `user_id` = NEW.user_id
    GROUP BY `emoji_name`
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) WHERE `user_id` = NEW.user_id;
END;

DROP TRIGGER IF EXISTS `reactions_insert`;
DELIMITER $$
$$
CREATE TRIGGER `reactions_delete` AFTER DELETE ON `reactions` FOR EACH ROW
BEGIN
  UPDATE `user_statistics` SET `reaction_count` = (
    SELECT COUNT(*) FROM `reactions`
    WHERE `user_id` = OLD.user_id
    LIMIT 1
  ) WHERE `user_id` = OLD.user_id;
  UPDATE `user_statistics` SET `favorite_emoji_name` = (
    SELECT `emoji_name` FROM `reactions`
    WHERE `user_id` = OLD.user_id
    GROUP BY `emoji_name`
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) WHERE `user_id` = OLD.user_id;
END;

DROP TRIGGER IF EXISTS `livecomments_insert`;
DELIMITER $$
$$
CREATE TRIGGER `livecomments_insert` AFTER INSERT ON `livecomments` FOR EACH ROW
BEGIN
  UPDATE `user_statistics` SET `livecomment_count` = (
    SELECT COUNT(*) FROM `livecomments`
    WHERE `user_id` = NEW.user_id
    LIMIT 1
  ) WHERE `user_id` = NEW.user_id;
  UPDATE `user_statistics` SET `tip_sum` = (
    SELECT IFNULL(SUM(`tip`), 0) FROM `livecomments`
    WHERE `user_id` = NEW.user_id
    LIMIT 1
  ) WHERE `user_id` = NEW.user_id AND NEW.tip IS NOT NULL;
END;

DROP TRIGGER IF EXISTS `livecomments_delete`;
DELIMITER $$
$$
CREATE TRIGGER `livecomments_delete` AFTER DELETE ON `livecomments` FOR EACH ROW
BEGIN
  UPDATE `user_statistics` SET `livecomment_count` = (
    SELECT COUNT(*) FROM `livecomments`
    WHERE `user_id` = OLD.user_id
    LIMIT 1
  ) WHERE `user_id` = OLD.user_id;
  UPDATE `user_statistics` SET `tip_sum` = (
    SELECT IFNULL(SUM(`tip`), 0) FROM `livecomments`
    WHERE `user_id` = OLD.user_id
    LIMIT 1
  ) WHERE `user_id` = OLD.user_id;
END;

DROP TRIGGER IF EXISTS `livestream_viewers_history_insert`;
DELIMITER $$
$$
CREATE TRIGGER `livestream_viewers_history_insert` AFTER INSERT ON `livestream_viewers_history` FOR EACH ROW
BEGIN
  UPDATE `user_statistics` SET (
    SELECT COUNT(*) FROM `livestream_viewers_history`
    WHERE `user_id` = NEW.user_id
    LIMIT 1
  ) WHERE `user_id` = NEW.user_id;
END;

DROP TRIGGER IF EXISTS `livestream_viewers_history_delete`;
DELIMITER $$
$$
CREATE TRIGGER `livestream_viewers_history_delete` AFTER INSERT ON `livestream_viewers_history` FOR EACH ROW
BEGIN
  UPDATE `user_statistics` SET (
    SELECT COUNT(*) FROM `livestream_viewers_history`
    WHERE `user_id` = DELETE.user_id
    LIMIT 1
  ) WHERE `user_id` = DELETE.user_id;
END;