import os
import uuid
from django.core.files.storage import default_storage
from django.utils.text import slugify


def save_upload(file_obj, folder="uploads"):
    """
    Centralized file upload helper.
    Saves the uploaded file through default_storage (local disk / MEDIA_ROOT in dev).
    """
    if not file_obj:
        return None

    name, ext = os.path.splitext(file_obj.name)
    clean_name = slugify(name)[:50]
    unique_filename = f"{folder}/{clean_name}_{uuid.uuid4().hex[:8]}{ext.lower()}"
    saved_path = default_storage.save(unique_filename, file_obj)
    return saved_path
