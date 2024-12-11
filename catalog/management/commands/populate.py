# Populate database
# This file has to be placed within the
# catalog/management/commands directory in your project.
# If that directory doesn't exist, create it.
# The name of the script is the name of the custom command,
# that is, populate.py.
#
# execute python manage.py  populate
#
# use module Faker generator to generate data
# (https://zetcode.com/python/faker/)
import os
from random import randint
from django.core.files import File
from django.core.management.base import BaseCommand
from catalog.models import (Author, Book, Comment)
from django.contrib.auth.models import User
from faker import Faker
from orders.models import Order, OrderItem
# define STATIC_PATH in settings.py
from caseshop.settings import STATIC_PATH
from PIL import Image, ImageDraw, ImageFont


FONTDIR = "/usr/share/fonts/truetype/freefont/FreeMono.ttf"

# The name of this class is not optional must be Command
# otherwise manage.py will not process it properly
#


class Command(BaseCommand):
    # helps and arguments shown when command python manage.py help populate
    # is executed.
    help = """populate database
           """

    # def add_arguments(self, parser):

    # handle is another compulsory name, do not change it"
    # handle function will be executed by 'manage populate'
    def handle(self, *args, **kwargs):
        # check a variable that is unlikely been set out of heroku
        # as DYNO to decide which font directory should be used.
        # Be aware that your available fonts may be different
        # from the ones defined here
        if 'DYNO' in os.environ:
            self.font = \
                "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
        else:
            self.font = \
                "/usr/share/fonts/truetype/freefont/FreeMono.ttf"

        self.NUMBERUSERS = 20
        self.NUMBERBOOKS = 30
        self.NUMBERAUTHORS = 10
        self.MAXAUTHORSPERBOOK = 3
        self.NUMBERCOMMENTS = self.NUMBERBOOKS * 5
        self.MAXCOPIESSTOCK = 30
        self.cleanDataBase()
        # The faker.Faker() creates and initializes a faker generator,
        self.faker = Faker()
        self.user()
        self.author()
        self.book()
        self.comment()
        # check a variable that is unlikely been set out of heroku
        # as DYNO to decide which font directory should be used.
        # Be aware that your available fonts may be different
        # from the ones defined here

    def cleanDataBase(self):
        """delete all models stored (clean table) in database
        In user we exclude the user alumnodb, that is the superuser,
        It can be done in several different ways,
        this is the most comfortable to not create the user
        every time the database is deleted"""
        User.objects.all().exclude(username='alumnodb').delete()
        Author.objects.all().delete()
        Book.objects.all().delete()
        Comment.objects.all().delete()
        Order.objects.all().delete()
        OrderItem.objects.all().delete()

    def user(self):
        " Insert users"
        fake = Faker()
        for _ in range(self.NUMBERUSERS):
            names = fake.unique.name().split()
            username = fake.unique.user_name()
            email = fake.email()
            first_name = names[0]
            last_name = names[1]
            password = "pass"

            u = User(username=username, password=password,
                     first_name=first_name, last_name=last_name, email=email)
            u.save()

    def author(self):
        " Insert authors"
        fake = Faker()
        for _ in range(self.NUMBERAUTHORS):
            names = fake.unique.name().split()
            first_name = names[0]
            last_name = names[1]
            a = Author(first_name=first_name, last_name=last_name)
            a.save()

    def cover(self, book):
        """create fake cover image.
           This function creates a very basic cover
           that show (partially),
           the primary key, title and author name"""

        img = Image.new('RGB', (200, 300), color=(73, 109, 137))
        # your font directory may be different
        fnt = ImageFont.truetype(
            self.font,
            28, encoding="unic")
        d = ImageDraw.Draw(img)
        d.text((10, 100), "PK %05d" % book.id, font=fnt, fill=(255, 255, 0))
        d.text((20, 150), book.title[:15], font=fnt, fill=(255, 255, 0))
        d.text((20, 200), "By %s" % str(
            book.author.all()[0])[:15], font=fnt, fill=(255, 255, 0))

        img.save(os.path.join(STATIC_PATH, book.path_to_cover_image.name))
        book.path_to_cover_image.save(os.path.join(book.path_to_cover_image.name), File(
            open(os.path.join(STATIC_PATH, book.path_to_cover_image.name), 'rb')))

    def book(self):
        " Insert books"
        fake = Faker()
        authorList = list(Author.objects.all())
        numAuthors = int(len(authorList) - 1)
        for _ in range(self.NUMBERBOOKS):
            title = str(fake.unique.name())
            isbn = str(fake.unique.isbn13()).replace("-", "")
            date = fake.date_time_this_century()
            number_copies_stock = randint(0, self.MAXCOPIESSTOCK)
            price = randint(0, 999)
            description = fake.text(max_nb_chars=100)
            score = randint(0, 10)

            b = Book(isbn=isbn, title=title, date=date,
                     number_copies_stock=number_copies_stock, path_to_cover_image=str(
                         title + '.jpeg'),
                     price=price, description=description, score=score)
            b.save()
            for _ in range(self.MAXAUTHORSPERBOOK):
                b.author.add(authorList[randint(1, numAuthors)])
            self.cover(b)

    def comment(self):
        " Insert comments"
        fake = Faker()
        bLenght = Book.objects.all().count() - 1
        uLenght = User.objects.all().count() - 1

        for _ in range(self.NUMBERCOMMENTS):
            user = User.objects.all()[randint(0, uLenght)]
            book = Book.objects.all()[randint(0, bLenght)]
            msg = fake.unique.sentence(nb_words=10)
            c = Comment(user=user, book=book, msg=msg)
            c.save()
