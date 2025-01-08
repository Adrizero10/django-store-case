from django.urls import reverse
from django.db import models
from django.contrib.auth.models import User
from django.template.defaultfilters import slugify
from django.core.validators import MaxValueValidator, MinValueValidator
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from datetime import datetime





class IphoneCase(models.Model):
    """This class represents a case

        Args:
            name: case name
            number_copies_stock: case stock
            path_to_cover_image: path for the poster of the case
            price: case price
            slug: human readable url
            description: case description
            score: case score

        Author : Adrian Crespo Musheghyan
    """
    # Campos
    
    name = models.CharField(max_length=256, null=True,
                             verbose_name='Name', unique=True)

    model = models.CharField(max_length=256, null=True,
                             verbose_name='Model', unique=False)
    
    color = models.CharField(max_length=256, null=True,
                            verbose_name='Color', unique=True)

    number_copies_stock = models.PositiveSmallIntegerField(default=0,
                                                           validators=[
                                                               MaxValueValidator(30)],
                                                           help_text='Stock between 0 and 10', verbose_name='Stock')

    # WhiteNoise is not suitable for serving user-uploaded “media” files :(
    path_to_cover_image = models.ImageField(verbose_name='Poster image',
                                            help_text='Select the poster of the case')

    # path_to_cover_image = models.CharField(
    #     blank=True, null=True, verbose_name='Poster image',
    #     help_text='Select the poster of the case', max_length=128)

    price = models.DecimalField(max_digits=7, decimal_places=2, verbose_name='Price',
                                validators=[MinValueValidator(0)], help_text='Price cant be negative')


    slug = models.SlugField(null=True, blank=True,
                            unique=True, verbose_name='Url slug')

    description = models.CharField(max_length=1024,
                                   verbose_name='Description', blank=True,
                                   null=True, help_text='Sort description of the case',
                                   default='Description no available')

    score = models.PositiveSmallIntegerField(default=0, verbose_name='Score', validators=[
        MaxValueValidator(10)],
        help_text='Score between 0 and 10')

    # Metadata
    class Meta:
        ordering = ["name","number_copies_stock", "price"]
        verbose_name = "Case"
        verbose_name_plural = "Cases"

    def get_absolute_url(self):
        return reverse('detail', kwargs={'slug': self.slug})

    def save(self, *args, **kwargs):
        # Concatenate the creation date of the case
        # with your name to ensure that it will always be unique
        # Since Epoch date
        if not self.slug:
            self.slug = slugify(self.name)
        
        self.model = self.model.title()
        self.color = self.color.title()
        self.name = self.name.title()

        return super().save(*args, **kwargs)

    def __str__(self):

        return 'Name %s, Stock %s' % (str(self.name), str(self.number_copies_stock))


class Comment(models.Model):
    """This class represents a comment from a user to a case

        Args:
            case: The commented case
            user: User who made the comment
            data_time: Comment date and time
            msg: comment message


        Author : Adrian Crespo Musheghyan
    """
    # Campos
    case = models.ForeignKey(
        IphoneCase, on_delete=models.CASCADE, verbose_name="Case")
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, verbose_name="Usuario")
    date_time = models.DateTimeField(
        verbose_name="Comment date", auto_now_add=True)
    msg = models.TextField(max_length=512, verbose_name="Message")

    # Metadata
    class Meta:
        ordering = ["date_time", "msg", "user", "case"]
        verbose_name = "Comment"
        verbose_name_plural = "Comments"

    def __str__(self):

        return '=> Date %s, Comment %s, Case %s, User %s' % (str(self.date_time),
                                                             str(self.msg), self.case, self.user)
