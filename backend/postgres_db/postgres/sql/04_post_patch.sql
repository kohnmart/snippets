/*************************************************************************************
 * post: PATCH function
 * as in https://gitlab.multimedia.hs-augsburg.de/kowa/wk_account_postgres_01
 *************************************************************************************/

BEGIN;

/* CLEANUP */
DROP FUNCTION IF EXISTS patch_post(_id UUID, _data JSONB);

/* Function */
CREATE FUNCTION patch_post(_id UUID, _data JSONB)
    RETURNS TABLE (result JSONB)
LANGUAGE plpgsql
AS
$$
    BEGIN
        RETURN QUERY
        SELECT rest_helper
        ('UPDATE post p
          SET
             "title"       = json_attr_value_not_null_d_untainted($2, ''title'', p."title"),
             "content"     = json_attr_value_not_null            ($2, ''content'', p."content")::TEXT,
             "language_id" = json_attr_value_not_null            ($2, ''language_id'', p."language_id"::TEXT)::UUID
          WHERE p."id" = $1',
         _id => _id, _data => _data, _constraint => 'post_exists'
        );
    END;
$$
;

COMMIT;

/*
SELECT * FROM post;
SELECT * 
FROM patch_post
     ((SELECT "id" FROM post WHERE "title"='Hello World in Javascript'),
      '{ "title":       "Update: Hello World in Javascript",
         "content":     "Update: This is an update."
       }'
     );
SELECT * FROM post;

SELECT * 
FROM patch_post
     ((SELECT "id" FROM post WHERE "title"='Update: Hello World in Javascript'),
      '{}'
     );
SELECT * FROM post;
*/
