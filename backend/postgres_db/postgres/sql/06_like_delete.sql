/*************************************************************************************
 * like: DELETE function
 *************************************************************************************/

BEGIN;

/* Cleanup */
DROP FUNCTION IF EXISTS delete_like (_data JSONB);

/* Function */
CREATE FUNCTION delete_like (_data JSONB)
    RETURNS TABLE (result JSONB)
LANGUAGE plpgsql
AS
$$
    BEGIN
        RETURN QUERY
        SELECT rest_helper
        ('DELETE
          FROM user_like
          WHERE user_id = ($2->>''user_id'')::UUID
                AND (post_id = ($2->>''subject_id'')::UUID OR comment_id = ($2->>''subject_id'')::UUID)',
         _data => _data, _constraint => 'like_exists'
        );
    END
$$
;

COMMIT;

/*
SELECT * FROM get_account;
SELECT * FROM get_post;
SELECT * FROM get_comment;
SELECT * FROM user_like;
SELECT * 
FROM delete_like
     ('{"user_id": copy_here,
        "subject_id": copy_here
        }'
     );
SELECT * FROM user_like;
*/
