import importlib.util
import os
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('cleanup', Path(__file__).resolve().parents[1] / 'deploy/cleanup.py')
cleanup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cleanup)

class CleanupTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        (self.base / 'releases').mkdir()
        self.names = {i: f'{i:012x}'+f'{i:028x}' for i in range(1, 13)}
        self.images = []
        for i, name in self.names.items():
            p = self.base / 'releases' / name
            p.mkdir()
            os.utime(p, (i, i))
            if i <= 10:
                # Use distinct leading prefixes, as production tags use the first 12 chars.
                tag = f'petrovich-clean:commit-{i:012x}'
                self.images.append({'id': f'image{i}', 'tags': [tag], 'created': f'{i:04}'})
        (self.base / 'current').symlink_to('releases/' + self.names[12])
        self.state = {'image': self.images[9]['tags'][0], 'previousImage': self.images[8]['tags'][0], 'previousCompose': str(self.base / 'releases' / self.names[9] / 'deploy/compose.yml')}

    def test_old_tags_only_and_all_container_images_protected(self):
        self.images += [{'id':'other', 'tags':['pb-search:keep'], 'created':'9999'}]
        containers = [{'imageId':'image1','image':self.images[0]['tags'][0],'mounts':[]}, {'imageId':'image2','image':self.images[1]['tags'][0],'mounts':[]}]
        p = cleanup.plan(self.base, self.images, containers, self.state)
        self.assertEqual(p['removeImageTags'], [self.images[i-1]['tags'][0] for i in [8,7,6,5,4,3]])
        self.assertNotIn('pb-search:keep', p['removeImageTags'])
        self.assertNotIn(self.state['previousImage'], p['removeImageTags'])

    def test_archive_mount_current_and_old_rollback_directories_survive(self):
        old = self.names[1]
        archive = self.names[2]
        self.state['previousCompose'] = str(self.base / 'releases' / old / 'deploy/compose.yml')
        containers = [{'imageId':'other','image':'nginx:stable','mounts':[{'Source':str(self.base / 'releases' / archive / 'deploy/archive.conf')}]}]
        p = cleanup.plan(self.base, self.images, containers, self.state)
        for name in [old, archive, self.names[12]]:
            self.assertNotIn(name, p['removeReleaseDirectories'])
        self.assertTrue(p['removeReleaseDirectories'])

    def test_unrecognized_directories_and_symlinks_are_never_removed(self):
        release = self.base / 'releases'
        (release / 'customer-backup').mkdir()
        name = 'f' * 40
        (release / name).symlink_to(self.base, target_is_directory=True)
        p = cleanup.plan(self.base, self.images, [], self.state)
        self.assertNotIn(name, p['removeReleaseDirectories'])
        self.assertNotIn('customer-backup', p['removeReleaseDirectories'])

    def test_only_expired_unmounted_prepare_directories_are_removed(self):
        release = self.base / 'releases'
        names = ['.prepare-'+'a'*12+'.old', '.prepare-'+'b'*12+'.fresh', '.prepare-'+'c'*12+'.mounted']
        for name in names:
            (release/name).mkdir()
            os.utime(release/name, (1, 1))
        os.utime(release/names[1], (100000, 100000))
        c = [{'imageId':'other','image':'debug','mounts':[{'Source':str(release/names[2])}]}]
        p = cleanup.plan(self.base, self.images, c, self.state, now=100000)
        self.assertEqual(p['removeTemporaryDirectories'], [names[0]])

if __name__ == '__main__':
    unittest.main()
