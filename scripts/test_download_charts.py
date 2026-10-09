import tempfile
import unittest
from pathlib import Path
from download_charts import chart_image, download_song, image_extension, index_songs


class DownloaderTests(unittest.TestCase):
    def test_index_only_collects_numbered_song_list(self):
        html = '<a href="about.html">About</a><ol><li><a href="all-of-me.html">All <b>Of</b> Me</a></li><li><a href="https://other.test/other.html">Other</a></li><li><a href="all-of-me.html">Duplicate</a></li></ol>'
        songs = index_songs(html, 'https://standardrepertoire.com/')
        self.assertEqual(len(songs), 1)
        self.assertEqual(songs[0]['title'], 'All Of Me')
        self.assertEqual(songs[0]['slug'], 'all-of-me')

    def test_chart_selected_by_alt_and_relative_url(self):
        html = '<img src="images/icon.png"><img alt="Chord chart for Solar" src="images/solar.jpg">'
        self.assertEqual(chart_image(html, 'https://standardrepertoire.com/solar.html'), 'https://standardrepertoire.com/images/solar.jpg')

    def test_download_resume_and_force(self):
        song = {'url': 'https://standardrepertoire.com/solar.html', 'slug': 'solar', 'title': 'Solar'}
        html = b'<h3>Solar</h3><img src="images/solar.jpg" alt="Chord chart">'
        image = b'\xff\xd8\xff' + b'fixture' * 5
        calls = []
        def fetch(url):
            calls.append(url)
            return image if url.endswith('.jpg') else html
        with tempfile.TemporaryDirectory() as directory:
            entry, skipped = download_song(song, directory, fetch)
            self.assertFalse(skipped)
            self.assertEqual(Path(directory, entry['file']).read_bytes(), image)
            self.assertTrue(Path(directory, 'solar.html').exists())
            resumed, skipped = download_song(song, directory, fetch, entry)
            self.assertTrue(skipped)
            self.assertEqual(resumed['image_url'], entry['image_url'])
            self.assertEqual(len(calls), 2)
            download_song(song, directory, fetch, entry, force=True)
            self.assertEqual(len(calls), 4)

    def test_rejects_html_error_responses_as_images(self):
        with self.assertRaises(ValueError):
            image_extension(b'<html>Not an image</html>')


if __name__ == '__main__':
    unittest.main()
