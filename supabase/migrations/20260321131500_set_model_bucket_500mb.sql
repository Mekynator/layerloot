-- Increase 3D model upload limit to 500 MB.
update storage.buckets
set file_size_limit = 524288000 -- 500 MB
where id = '3d-models';
